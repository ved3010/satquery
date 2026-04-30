"""
CPU smoke test for the M1 training loop.

Purpose: catch shape, dtype and API errors in the *exact* code path the Kaggle
notebook runs, before spending GPU-hours on it. Finding a broken tensor shape at
hour three of a P100 session costs a tenth of the weekly quota; finding it here
costs 30 seconds.

This does NOT train a useful model -- it runs a handful of steps on whatever
IndiaSat patches exist locally, with randomly-initialised weights (no 600 MB
pretrained download). It asserts the loop runs and the loss is finite.

    python scripts/smoke_test_m1.py
"""
from __future__ import annotations

import glob
import os
import sys

import numpy as np
import torch
import torch.nn as nn
import torch.nn.functional as F

# torch.onnx's progress output contains emoji. The default Windows console
# codepage is cp1252, which cannot encode them, and the UnicodeEncodeError
# aborts an otherwise successful export. Harmless everywhere else.
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "data", "indiasat")
S2_N, S1_N = 12, 2
IN_CH = S2_N + S1_N
PATCH_PX = 120


def main() -> int:
    import pyarrow.parquet as pq

    pfile = os.path.join(OUT, "IndiaSat.txt.parquet")
    if not os.path.exists(pfile):
        print("no IndiaSat parquet - run scripts/build_india_dataset.py first")
        return 1

    rows = pq.read_table(pfile).to_pylist()
    caps = {r["patch_id"]: r for r in rows if r["type"] == "captioning"}
    files = [f for f in sorted(glob.glob(os.path.join(OUT, "patches", "*.npz")))
             if os.path.basename(f)[:-4] in caps]
    print(f"{len(files)} captioned patches")
    if len(files) < 4:
        print("need at least 4 patches for a contrastive batch")
        return 1

    # --- the 14-channel surgery, exactly as the notebook does it ----------- #
    import open_clip
    model, _, _ = open_clip.create_model_and_transforms("ViT-B-32", pretrained=None)
    tokenizer = open_clip.get_tokenizer("ViT-B-32")
