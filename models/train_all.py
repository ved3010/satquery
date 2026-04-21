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


