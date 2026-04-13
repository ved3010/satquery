"""
Fetch BigEarthNet.txt — the primary training corpus for PS 26167.

    arXiv:2603.29630 · https://txt.bigearth.net
    HF: BIFOLD-BigEarthNetv2-0/BigEarthNet.txt · licence CDLA-Permissive-1.0

The structural fact that makes this project feasible on a laptop with no GPU:

    TEXT annotations  = one 467 MB parquet, 9,553,962 rows  -> download locally
    IMAGE patches     = BigEarthNet v2 / reBEN, ~120 GB     -> Kaggle only

So we pull the text here, decide which patches we actually need, and fetch only
those inside a Kaggle session. 120 GB becomes ~18 GB of scratch.

Usage:
    python scripts/get_bigearthnet_txt.py --peek        # stream a few rows, no download
    python scripts/get_bigearthnet_txt.py               # full 467 MB parquet
    python scripts/get_bigearthnet_txt.py --stats       # summarise a downloaded copy
"""
from __future__ import annotations

import argparse
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT_DIR = os.path.join(ROOT, "data", "bigearthnet_txt")
REPO = "BIFOLD-BigEarthNetv2-0/BigEarthNet.txt"


def peek(n: int = 5) -> int:
    """Stream the first rows without downloading the file.

    Worth running before anything else: the exact column names decide how the
    M3/M4/M7 training sets are built, and guessing them wastes a Kaggle session.
    """
    try:
        from datasets import load_dataset
    except ImportError:
