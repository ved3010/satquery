"""
Train M7 -- the small remote-sensing VLM -- on the IndiaSat instruction mix.

    python -m models.train_vlm                 # ~15 epochs, CPU
    python -m models.train_vlm --epochs 8      # shorter

The vision tower is initialised from the trained M1 encoder and frozen, so its
features are computed once for all 985 patches and reused every epoch. That is
what makes this trainable on four CPU cores: the only thing learning is the
projector and the 4-layer decoder (2.3 M parameters).

Reported against baselines, because an accuracy with no baseline cannot answer
"is the model using the image at all?":

    binary (yes/no)  vs the majority answer in train
    mcq (a/b/c/d)    vs the majority option in train
    captioning       next-token accuracy
    blind ablation   the same weights evaluated with the visual tokens zeroed
"""
from __future__ import annotations

import argparse
import json
import os
import sys
import time
from collections import Counter

import numpy as np
import torch
import torch.nn.functional as F

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from models.train_all import Corpus, REPORTS, WEIGHTS, reseed, tokenize  # noqa: E402
from models.vlm import N_VIS, M7VLM, count_params                        # noqa: E402

MAX_INSTR, MAX_ANS = 40, 50
torch.set_num_threads(4)


# --------------------------------------------------------------------------- #
# data
# --------------------------------------------------------------------------- #
class VLMData:
    """Instruction pairs plus cached frozen-tower features.

    Features are cached per *patch*, not per example: 985 patches back 8,962
    questions, so caching by example would store the same tensor nine times.
    """

    def __init__(self, C, m7):
        self.C = C
        self.vocab = list(C.vocab) + ["<sep>"]
        self.w2i = {w: i for i, w in enumerate(self.vocab)}
        self.BOS, self.EOS, self.SEP = 2, 3, len(self.vocab) - 1

        t0 = time.perf_counter()
        pooled, grid = [], []
        m7.eval()
        with torch.no_grad():
            for i in range(0, len(C.ids), 16):
                chunk = C.ids[i:i + 16]
                x = torch.from_numpy(np.stack([C.x14(p) for p in chunk]))
                p, g = m7.encode_image(x)
                pooled.append(p)
                grid.append(g)
        self.pooled = torch.cat(pooled)
        self.grid = torch.cat(grid)
        self.pidx = {p: i for i, p in enumerate(C.ids)}
        print("  cached %d patch features in %.0fs (%.0f MB)"
              % (len(C.ids), time.perf_counter() - t0, self.grid.numel() * 4 / 1e6),
              flush=True)

        self.rows = {"train": [], "validation": [], "test": []}
        for r in C.rows:
            pid = r["patch_id"]
            if pid not in self.pidx or r["split"] not in self.rows:
                continue
            self.rows[r["split"]].append({
                "pid": pid,
                "instr": self._ids(r["input"], MAX_INSTR),
                "ans": self._ids(r["output"], MAX_ANS),
                "type": r["type"],
                "gold": " ".join(tokenize(r["output"])[:MAX_ANS]),
            })

    def _ids(self, text, cap):
        return [self.w2i.get(w, 1) for w in tokenize(text)[:cap]]

    def decode(self, ids):
        return " ".join(self.vocab[i] for i in ids
                        if 3 < i < len(self.vocab) - 1)

    def batch(self, rows):
        """Returns pooled, grid, inputs, targets, loss_mask."""
        seqs = [[self.BOS] + r["instr"] + [self.SEP] + r["ans"] + [self.EOS]
                for r in rows]
        L = max(len(s) for s in seqs)
        ids = torch.zeros(len(rows), L, dtype=torch.long)
        keep = torch.zeros(len(rows), L - 1)
        for i, (s, r) in enumerate(zip(seqs, rows)):
            ids[i, :len(s)] = torch.tensor(s)
            # targets are seq[1:], so the answer span begins at index
            # len(instr) + 1 and runs through the terminating <eos>.
            a0 = len(r["instr"]) + 1
            keep[i, a0:len(s) - 1] = 1.0
        j = torch.tensor([self.pidx[r["pid"]] for r in rows])
        return self.pooled[j], self.grid[j], ids[:, :-1], ids[:, 1:], keep

    def prompt(self, row):
        """Prompt tokens for one row. One row at a time: right-padding a batch
        of different-length prompts would generate from the wrong position."""
        ids = torch.tensor([[self.BOS] + row["instr"] + [self.SEP]])
        j = torch.tensor([self.pidx[row["pid"]]])
        return self.pooled[j], self.grid[j], ids


# --------------------------------------------------------------------------- #
# train
# --------------------------------------------------------------------------- #
def train(epochs=15, bs=32, lr=3e-4):
    reseed("M7")
    print("=== M7 vlm -- instruction-following VLM on IndiaSat ===", flush=True)
    C = Corpus()
    m7 = M7VLM(vocab=len(C.vocab) + 1)

    # frozen vision tower, initialised from the trained M1 encoder
    m1p = os.path.join(WEIGHTS, "m1_rsclip_small.pt")
    if os.path.exists(m1p):
        sd = torch.load(m1p, map_location="cpu")
        enc = {k[4:]: v for k, v in sd.items() if k.startswith("enc.")}
        info = m7.enc.load_state_dict(enc, strict=False)
        print("  vision tower <- M1 (%d missing, %d unexpected)"
              % (len(info.missing_keys), len(info.unexpected_keys)))
    else:
        print("  WARNING: m1_rsclip_small.pt not found -- random vision tower")
    for p in m7.enc.parameters():
        p.requires_grad = False

    D = VLMData(C, m7)
    tr, te = D.rows["train"], D.rows["test"]
    print("  %.2fM trainable of %.2fM | train %d test %d | vocab %d"
          % (count_params(m7), count_params(m7, False), len(tr), len(te),
             len(D.vocab)))
    print("  types: %s" % dict(Counter(r["type"] for r in tr)), flush=True)

    opt = torch.optim.AdamW([p for p in m7.parameters() if p.requires_grad],
                            lr=lr, weight_decay=0.01)
    steps = max(2, epochs * (len(tr) // bs))
    sched = torch.optim.lr_scheduler.OneCycleLR(opt, max_lr=lr,
                                                total_steps=steps,
                                                pct_start=0.1)
    hist, step = [], 0
    for ep in range(epochs):
        m7.train()
        tot = n = 0.0
        order = np.random.permutation(len(tr))
        t0 = time.perf_counter()
        for i in range(0, len(order) - bs + 1, bs):
            rows = [tr[j] for j in order[i:i + bs]]
            pooled, grid, x, y, keep = D.batch(rows)
            logits = m7(pooled, grid, x)
            loss = F.cross_entropy(logits.reshape(-1, logits.size(-1)),
                                   y.reshape(-1), reduction="none")
            loss = (loss * keep.reshape(-1)).sum() / keep.sum().clamp(min=1)
            opt.zero_grad()
            loss.backward()
            torch.nn.utils.clip_grad_norm_(
                [p for p in m7.parameters() if p.requires_grad], 1.0)
            opt.step()
            if step < steps - 1:
                sched.step()
            step += 1
            tot += float(loss.detach()) * len(rows)
            n += len(rows)
        hist.append({"epoch": ep, "loss": tot / max(n, 1)})
        print("  ep %2d  loss %.4f  [%.0fs]"
              % (ep, tot / max(n, 1), time.perf_counter() - t0), flush=True)

    return m7, D, C, hist


# --------------------------------------------------------------------------- #
# evaluate
# --------------------------------------------------------------------------- #
@torch.no_grad()
def evaluate(m7, D, blind=False, split="test"):
    m7.eval()
    te, tr = D.rows[split], D.rows["train"]
    per = {}

    n_by_type = Counter(r["type"] for r in tr)
    maj = {}
    for t in {r["type"] for r in te}:
        c = Counter(r["gold"] for r in tr if r["type"] == t).most_common(1)
        maj[t] = c[0][1] / max(1, n_by_type[t]) if c else 0.0

    for r in te:
        pooled, grid, ids = D.prompt(r)
        if blind:
            pooled, grid = torch.zeros_like(pooled), torch.zeros_like(grid)
        t = per.setdefault(r["type"], {"n": 0, "exact": 0, "hit": 0, "tot": 0})
        t["n"] += 1

        if r["type"] == "captioning":
            # Teacher-forced next-token accuracy. Greedy free generation of a
            # 40-word caption is dominated by the first divergence and says
            # little about how well the model tracks the scene.
            _, _, x, y, keep = D.batch([r])
            if blind:
                p0, g0 = torch.zeros_like(pooled), torch.zeros_like(grid)
            else:
                p0, g0 = pooled, grid
            logits = m7(p0, g0, x)
            t["hit"] += int(((logits.argmax(-1) == y).float() * keep).sum())
            t["tot"] += int(keep.sum())
            continue

        out = m7.generate(pooled, grid, ids, eos=D.EOS,
                          max_new=min(MAX_ANS, len(r["ans"]) + 4))
        t["exact"] += int(D.decode(out[0].tolist()) == r["gold"])

    report = {}
    for k, v in per.items():
        report[k] = {"n": v["n"], "majority_baseline": round(maj.get(k, 0.0), 4)}
        if v["tot"]:
            report[k]["next_token_acc"] = round(v["hit"] / v["tot"], 4)
        else:
            report[k]["exact_match"] = round(v["exact"] / v["n"], 4)
    return report


def _line(k, s, b):
    if "exact_match" in s:
        return ("  %-14s exact %.4f  blind %.4f  majority %.4f  (n=%d)"
                % (k, s["exact_match"], b.get("exact_match", float("nan")),
                   s["majority_baseline"], s["n"]))
    return ("  %-14s next-token %.4f  blind %.4f  (n=%d)"
            % (k, s["next_token_acc"], b.get("next_token_acc", float("nan")),
               s["n"]))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--epochs", type=int, default=15)
    ap.add_argument("--bs", type=int, default=32)
    ap.add_argument("--lr", type=float, default=3e-4)
    a = ap.parse_args()

    t0 = time.perf_counter()
    m7, D, C, hist = train(a.epochs, a.bs, a.lr)

    print("\n  evaluating on the held-out test split ...", flush=True)
    seen = evaluate(m7, D, blind=False)
    print("  blind ablation (same weights, image zeroed) ...", flush=True)
    unseen = evaluate(m7, D, blind=True)
    for k in sorted(seen):
        print(_line(k, seen[k], unseen[k]), flush=True)

    os.makedirs(WEIGHTS, exist_ok=True)
    os.makedirs(REPORTS, exist_ok=True)
    torch.save(m7.state_dict(), os.path.join(WEIGHTS, "m7_vlm.pt"))
    with open(os.path.join(WEIGHTS, "m7_vlm_vocab.json"), "w",
              encoding="utf-8") as fh:
        json.dump({"vocab": D.vocab, "bos": D.BOS, "eos": D.EOS,
                   "sep": D.SEP, "n_vis": N_VIS,
                   "max_instr": MAX_INSTR, "max_ans": MAX_ANS}, fh)

    report = {
        "model": "M7",
        "architecture": "frozen M1 vision tower -> 17 visual tokens -> "
                        "4-layer causal decoder (d=256, 2.34M trainable)",
        "train_data": "IndiaSat instruction mix, 985 patches, %d train / %d test"
                      % (len(D.rows["train"]), len(D.rows["test"])),
        "epochs": a.epochs, "batch_size": a.bs, "lr": a.lr,
        "test": seen, "blind_ablation": unseen, "history": hist,
        "seconds": round(time.perf_counter() - t0, 1),
        "caveat": "Word-level vocabulary of 265 tokens over one corpus. It "
                  "answers IndiaSat-style instructions about Indian Sentinel "
                  "patches; it is not a general-purpose VLM. Quantitative "
                  "percentages in a report come from the measured spectral "
                  "indices, never from this model.",
    }
    with open(os.path.join(REPORTS, "m7_vlm.json"), "w", encoding="utf-8") as fh:
        json.dump(report, fh, indent=2)
    print("\n  saved models/weights/m7_vlm.pt (%.1f MB)"
          % (os.path.getsize(os.path.join(WEIGHTS, "m7_vlm.pt")) / 1e6))
    print("  report models/reports/m7_vlm.json  [%.0fs]" % report["seconds"])


if __name__ == "__main__":
    main()
