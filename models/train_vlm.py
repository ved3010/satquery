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
