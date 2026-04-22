"""
Train every CPU-trainable specialist on IndiaSat and report honest metrics.

    python -m models.train_all              # all heads
    python -m models.train_all --only M6    # one head

Each head reports against a baseline, because an accuracy with no baseline
cannot answer "is the model using the image at all?":

    M1  retrieval R@k   vs random chance (1/gallery size)
    M3  caption tokens  vs predicting the most frequent token
    M4  box IoU         vs the mean training box (a fixed rectangle)
    M5b change answer   vs majority class
    M6  multilabel mAP  vs class-prior prediction

Splits come from the dataset builder's deterministic grid hash, so neighbouring
patches -- which overlap in content -- never straddle train and test.

Everything runs on CPU in minutes. These are deliberately small models on a
small corpus; the numbers are real but modest, and the report says so.
"""
from __future__ import annotations

import argparse
import glob
import json
import os
import re
import sys
import time
from collections import Counter

import numpy as np
import torch
import torch.nn as nn
import torch.nn.functional as F

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from models.backbone import (IN_CH, N_CLASSES, N_S1, N_S2,  # noqa: E402
                             M1Clip, M3Caption, M4Ground, M5Change, M6Fusion,
                             count_params)

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, "data", "indiasat")
WEIGHTS = os.path.join(ROOT, "models", "weights")
REPORTS = os.path.join(ROOT, "models", "reports")
WC_IDS = [10, 20, 30, 40, 50, 60, 70, 80, 90, 95, 100]
CLS_INDEX = {c: i for i, c in enumerate(WC_IDS)}

torch.set_num_threads(4)          # 4 physical cores
SEED = 0


def reseed(tag: str) -> None:
    """Reset the RNGs at the start of every model.

    Seeding once at import makes each model's result depend on which models ran
    before it: in a full run M6/M1/M3/M4 consume randomness before M5 starts, so
    `--only M5` saw a different stream and produced a different number (measured:
    change-mask IoU 0.4304 vs 0.5090 for the same code and data). Per-model
    seeding makes a single-model run reproduce its slice of a full run exactly.
    """
    # zlib.crc32, not hash(): Python randomises string hashing per process
    # (PYTHONHASHSEED), so hash(tag) would give a different seed on every run —
    # exactly the non-reproducibility this function exists to remove.
    import zlib
    h = (SEED + zlib.crc32(tag.encode())) % (2 ** 31)
    torch.manual_seed(h)
    np.random.seed(h)


# --------------------------------------------------------------------------- #
# data
# --------------------------------------------------------------------------- #
def tokenize(s: str) -> list[str]:
    return re.findall(r"[a-z0-9]+", s.lower())


class Corpus:
    """Loads every patch into RAM once. 489 patches x 14 x 120 x 120 is ~200 MB
    as float32 -- small enough that repeated disk reads would dominate runtime."""

    def __init__(self):
        import pyarrow.parquet as pq
        rows = pq.read_table(os.path.join(DATA, "IndiaSat.txt.parquet")).to_pylist()
        self.rows = rows
        self.by_patch: dict[str, list[dict]] = {}
        for r in rows:
            self.by_patch.setdefault(r["patch_id"], []).append(r)

        self.patches: dict[str, dict] = {}
        for f in sorted(glob.glob(os.path.join(DATA, "patches", "*.npz"))):
            pid = os.path.basename(f)[:-4]
            if pid in self.by_patch:
                self.patches[pid] = dict(np.load(f))
        self.ids = sorted(self.patches)
        self.split = {r["patch_id"]: r["split"] for r in rows}

        # per-sensor normalisation from TRAIN patches only (no test leakage)
        tr = [p for p in self.ids if self.split[p] == "train"] or self.ids
        s2 = np.stack([self.patches[p]["s2"] for p in tr]).astype(np.float32)
        self.m2, self.s2s = s2.mean((0, 2, 3)), s2.std((0, 2, 3)) + 1e-6
        if "s1" in self.patches[self.ids[0]]:
            s1 = np.stack([self.patches[p]["s1"] for p in tr]).astype(np.float32)
            self.m1, self.s1s = s1.mean((0, 2, 3)), s1.std((0, 2, 3)) + 1e-6
        else:
            self.m1, self.s1s = np.zeros(N_S1, np.float32), np.ones(N_S1, np.float32)

        words = Counter()
        for r in rows:
            words.update(tokenize(str(r["input"])))
            words.update(tokenize(str(r["output"])))
        self.vocab = ["<pad>", "<unk>", "<bos>", "<eos>"] + \
                     [w for w, c in words.most_common() if c >= 2]
        self.w2i = {w: i for i, w in enumerate(self.vocab)}

    # -- tensors ---------------------------------------------------------- #
    def s2_of(self, pid, key="s2"):
        a = self.patches[pid][key].astype(np.float32)
        return (a - self.m2[:, None, None]) / self.s2s[:, None, None]

    def s1_of(self, pid):
        p = self.patches[pid]
        if "s1" not in p:
            return np.zeros((N_S1, 120, 120), np.float32)
        a = p["s1"].astype(np.float32)
        return (a - self.m1[:, None, None]) / self.s1s[:, None, None]

    def x14(self, pid):
        return np.concatenate([self.s2_of(pid), self.s1_of(pid)], 0)

    def encode(self, text, maxlen=32, bos=False):
        t = tokenize(str(text))[:maxlen - (2 if bos else 0)]
        ids = [self.w2i.get(w, 1) for w in t]
        if bos:
            ids = [2] + ids + [3]
        mask = [1.0] * len(ids) + [0.0] * (maxlen - len(ids))
        ids = ids + [0] * (maxlen - len(ids))
        return ids[:maxlen], mask[:maxlen]

    def split_ids(self, s):
        return [p for p in self.ids if self.split.get(p) == s]

    def multilabel(self, pid, floor=0.05):
        lab = self.patches[pid]["label"]
        v, c = np.unique(lab, return_counts=True)
        y = np.zeros(N_CLASSES, np.float32)
        for cls, n in zip(v, c):
            if int(cls) in CLS_INDEX and n / lab.size >= floor:
                y[CLS_INDEX[int(cls)]] = 1.0
        return y


def batches(items, bs, shuffle=True):
    idx = np.random.permutation(len(items)) if shuffle else np.arange(len(items))
    for i in range(0, len(idx), bs):
        yield [items[j] for j in idx[i:i + bs]]


def save(model, name, report):
    os.makedirs(WEIGHTS, exist_ok=True)
    os.makedirs(REPORTS, exist_ok=True)
    torch.save(model.state_dict(), os.path.join(WEIGHTS, f"{name}.pt"))
    with open(os.path.join(REPORTS, f"{name}.json"), "w") as fh:
        json.dump(report, fh, indent=2)


# --------------------------------------------------------------------------- #
# M6 — optical-SAR fusion (mandatory M-5)
# --------------------------------------------------------------------------- #
def train_m6(C, epochs=30, bs=32):
    reseed("M6")
    print("\n=== M6 fusion — optical+SAR multilabel land cover ===")
    tr, va, te = (C.split_ids("train"), C.split_ids("validation"), C.split_ids("test"))
    model = M6Fusion()
    opt = torch.optim.AdamW(model.parameters(), lr=2e-3, weight_decay=1e-4)
    print(f"  {count_params(model):.2f}M params | train {len(tr)} val {len(va)} test {len(te)}")

    Y = {p: C.multilabel(p) for p in C.ids}
    prior = np.stack([Y[p] for p in tr]).mean(0)

    def evaluate(ids, s2_only=False, s1_only=False, cloud=0.0):
        model.eval()
        P, T = [], []
        with torch.no_grad():
            for b in batches(ids, 64, shuffle=False):
                s2 = torch.from_numpy(np.stack([C.s2_of(p) for p in b]))
                s1 = torch.from_numpy(np.stack([C.s1_of(p) for p in b]))
                if cloud > 0:
                    # simulate cloud: replace a fraction of the optical scene
                    # with a bright, near-uniform patch, as real cloud does
                    n = int(120 * cloud)
                    s2[:, :, :n, :] = 3.0
                if s2_only:
                    s1 = torch.zeros_like(s1)
                if s1_only:
                    s2 = torch.zeros_like(s2)
                P.append(torch.sigmoid(model(s2, s1)).numpy())
                T.append(np.stack([Y[p] for p in b]))
        return np.concatenate(P), np.concatenate(T)

    def mAP(P, T):
        aps = []
        for k in range(N_CLASSES):
            if T[:, k].sum() == 0:
                continue
            o = np.argsort(-P[:, k])
            t = T[o, k]
            cum = np.cumsum(t)
            prec = cum / (np.arange(len(t)) + 1)
            aps.append((prec * t).sum() / t.sum())
        return float(np.mean(aps)), len(aps)

    best, hist = -1.0, []
    for ep in range(epochs):
        model.train()
        tot = nb = 0
        for b in batches(tr, bs):
            s2 = torch.from_numpy(np.stack([C.s2_of(p) for p in b]))
            s1 = torch.from_numpy(np.stack([C.s1_of(p) for p in b]))
            y = torch.from_numpy(np.stack([Y[p] for p in b]))
            loss = F.binary_cross_entropy_with_logits(model(s2, s1), y)
            opt.zero_grad(); loss.backward(); opt.step()
            tot += loss.item(); nb += 1
        P, T = evaluate(va)
        m, _ = mAP(P, T)
        hist.append({"epoch": ep, "loss": tot / max(nb, 1), "val_mAP": m})
        if m > best:
            best = m
            torch.save(model.state_dict(), os.path.join(WEIGHTS, "_m6_best.pt"))
        if ep % 5 == 0 or ep == epochs - 1:
            print(f"  ep {ep:2d}  loss {tot/max(nb,1):.4f}  val mAP {m:.4f}")

    model.load_state_dict(torch.load(os.path.join(WEIGHTS, "_m6_best.pt")))
    os.remove(os.path.join(WEIGHTS, "_m6_best.pt"))

    P, T = evaluate(te)
    test_map, n_cls = mAP(P, T)
    prior_map, _ = mAP(np.tile(prior, (len(T), 1)), T)

    # the ablation that justifies cross-modal analysis at all
    abl = {}
    for tag, kw in [("fused", {}), ("s2_only", {"s2_only": True}),
                    ("s1_only", {"s1_only": True}),
                    ("fused_cloud50", {"cloud": 0.5}),
                    ("s2_only_cloud50", {"s2_only": True, "cloud": 0.5}),
                    ("s1_only_cloud50", {"s1_only": True, "cloud": 0.5})]:
        p, t = evaluate(te, **kw)
        abl[tag] = round(mAP(p, t)[0], 4)

    print(f"  TEST mAP {test_map:.4f}  (class-prior baseline {prior_map:.4f}, "
          f"{n_cls} classes present)")
    print("  ablation:", json.dumps(abl))
    rep = {"model": "M6", "test_mAP": test_map, "prior_baseline_mAP": prior_map,
           "n_classes_scored": n_cls, "n_train": len(tr), "n_test": len(te),
           "ablation_mAP": abl, "history": hist}
    save(model, "m6_fusion", rep)
    return rep


# --------------------------------------------------------------------------- #
# M1 — contrastive image/text
# --------------------------------------------------------------------------- #
def train_m1(C, epochs=40, bs=32):
    reseed("M1")
    print("\n=== M1 rsclip — contrastive image/text ===")
    caps = {r["patch_id"]: r["output"] for r in C.rows if r["type"] == "captioning"}
    ids = [p for p in C.ids if p in caps]
    tr = [p for p in ids if C.split[p] == "train"]
    te = [p for p in ids if C.split[p] == "test"]
    model = M1Clip(len(C.vocab))
    opt = torch.optim.AdamW(model.parameters(), lr=1e-3, weight_decay=1e-4)
    print(f"  {count_params(model):.2f}M params | vocab {len(C.vocab)} | "
          f"train {len(tr)} test {len(te)}")

    def emb(pids):
        model.eval()
        I, T = [], []
        with torch.no_grad():
            for b in batches(pids, 64, shuffle=False):
                x = torch.from_numpy(np.stack([C.x14(p) for p in b]))
                enc = [C.encode(caps[p]) for p in b]
                i_ = torch.tensor([e[0] for e in enc])
                m_ = torch.tensor([e[1] for e in enc])
                a, t = model(x, i_, m_)
                I.append(a); T.append(t)
        return torch.cat(I), torch.cat(T)

    def recall(pids):
        if len(pids) < 2:
            return {}
        I, T = emb(pids)
        S = I @ T.t(); n = len(I)
        gt = torch.arange(n)
        out = {}
        for k in (1, 5, 10):
            if k <= n:
                out[f"i2t_R@{k}"] = (S.topk(k, 1).indices == gt[:, None]).any(1).float().mean().item()
        return out

    hist = []
    for ep in range(epochs):
        model.train()
        tot = nb = 0
        for b in batches(tr, bs):
            if len(b) < 2:
                continue
            x = torch.from_numpy(np.stack([C.x14(p) for p in b]))
            enc = [C.encode(caps[p]) for p in b]
            i_ = torch.tensor([e[0] for e in enc])
            m_ = torch.tensor([e[1] for e in enc])
            im, tx = model(x, i_, m_)
            logits = model.logit_scale.exp().clamp(max=100) * im @ tx.t()
            lbl = torch.arange(len(b))
            loss = (F.cross_entropy(logits, lbl) + F.cross_entropy(logits.t(), lbl)) / 2
            opt.zero_grad(); loss.backward(); opt.step()
            tot += loss.item(); nb += 1
        if ep % 10 == 0 or ep == epochs - 1:
            r = recall(te)
            hist.append({"epoch": ep, "loss": tot / max(nb, 1), **r})
            print(f"  ep {ep:2d}  loss {tot/max(nb,1):.4f}  test i2t_R@1 {r.get('i2t_R@1',0):.3f}")

    r = recall(te)
    chance = 1.0 / max(len(te), 1)
    print(f"  TEST {json.dumps({k: round(v,4) for k,v in r.items()})}  "
          f"(random chance R@1 = {chance:.4f}, gallery {len(te)})")
    rep = {"model": "M1", "test": r, "chance_R@1": chance, "gallery": len(te),
           "n_train": len(tr), "history": hist}
    save(model, "m1_rsclip_small", rep)
    return rep


# --------------------------------------------------------------------------- #
# M3 — captioning
# --------------------------------------------------------------------------- #
def train_m3(C, epochs=40, bs=32, maxlen=48):
    reseed("M3")
    print("\n=== M3 caption ===")
    caps = {r["patch_id"]: r["output"] for r in C.rows if r["type"] == "captioning"}
    ids = [p for p in C.ids if p in caps]
    tr = [p for p in ids if C.split[p] == "train"]
    te = [p for p in ids if C.split[p] == "test"]
    model = M3Caption(len(C.vocab))
    opt = torch.optim.AdamW(model.parameters(), lr=2e-3)
    print(f"  {count_params(model):.2f}M params | train {len(tr)} test {len(te)}")

    def seq(pids):
        s = [C.encode(caps[p], maxlen, bos=True)[0] for p in pids]
        return torch.tensor(s)

    hist = []
    for ep in range(epochs):
        model.train(); tot = nb = 0
        for b in batches(tr, bs):
            x = torch.from_numpy(np.stack([C.x14(p) for p in b]))
            y = seq(b)
            logits = model(x, y[:, :-1])
            loss = F.cross_entropy(logits.reshape(-1, logits.size(-1)),
                                   y[:, 1:].reshape(-1), ignore_index=0)
            opt.zero_grad(); loss.backward(); opt.step()
            tot += loss.item(); nb += 1
        if ep % 10 == 0 or ep == epochs - 1:
            hist.append({"epoch": ep, "loss": tot / max(nb, 1)})
            print(f"  ep {ep:2d}  loss {tot/max(nb,1):.4f}")

    # token-level accuracy on the test split, against a most-frequent-token baseline
    model.eval()
    correct = total = 0
    with torch.no_grad():
        for b in batches(te, 32, shuffle=False):
            x = torch.from_numpy(np.stack([C.x14(p) for p in b]))
            y = seq(b)
            pred = model(x, y[:, :-1]).argmax(-1)
            tgt = y[:, 1:]
            m = tgt != 0
            correct += (pred[m] == tgt[m]).sum().item(); total += m.sum().item()
    acc = correct / max(total, 1)

    tok = Counter()
    for p in tr:
