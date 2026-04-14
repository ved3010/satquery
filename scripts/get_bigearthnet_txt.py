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
        print("Needs the datasets library:  pip install datasets")
        return 1

    print(f"streaming {REPO} (no download)...\n")
    ds = load_dataset(REPO, split="all_data", streaming=True)
    it = iter(ds)
    first = next(it)

    print("COLUMNS")
    for k, v in first.items():
        t = type(v).__name__
        s = str(v).replace("\n", " ")
        print(f"  {k:<24} {t:<8} {s[:88]}{'...' if len(s) > 88 else ''}")

    print(f"\nFIRST {n} ROWS")
    for i, row in enumerate([first] + [next(it) for _ in range(n - 1)], 1):
        print(f"\n--- row {i} ---")
        for k, v in row.items():
            s = str(v).replace("\n", " ")
            print(f"  {k}: {s[:150]}{'...' if len(s) > 150 else ''}")
    return 0


def download() -> int:
    try:
        from huggingface_hub import snapshot_download
    except ImportError:
        print("Needs huggingface_hub:  pip install huggingface_hub")
        return 1

    os.makedirs(OUT_DIR, exist_ok=True)
    print(f"downloading {REPO} -> {OUT_DIR}\n(~467 MB; resumes if interrupted)")
    path = snapshot_download(repo_id=REPO, repo_type="dataset",
                             local_dir=OUT_DIR, allow_patterns=["*.parquet", "*.md", "*.json"])
    total = sum(os.path.getsize(os.path.join(r, f))
                for r, _, fs in os.walk(path) for f in fs)
    print(f"\ndone: {total / 1e6:.0f} MB in {path}")
    return 0


def stats() -> int:
    """Summarise a downloaded copy: row counts per annotation type.

    This is what tells us how many caption / VQA / grounding samples exist, and
    therefore how to weight the M7 instruction mix.
    """
    try:
        import pyarrow.parquet as pq
    except ImportError:
        print("Needs pyarrow:  pip install pyarrow")
        return 1

    files = [os.path.join(r, f) for r, _, fs in os.walk(OUT_DIR)
             for f in fs if f.endswith(".parquet")]
    if not files:
        print(f"no parquet under {OUT_DIR} — run without --stats first")
        return 1

    for f in files:
        pf = pq.ParquetFile(f)
        print(f"\n{os.path.basename(f)}")
        print(f"  rows    {pf.metadata.num_rows:,}")
        print(f"  columns {[c for c in pf.schema_arrow.names]}")
        print(f"  size    {os.path.getsize(f) / 1e6:.0f} MB")
    return 0


if __name__ == "__main__":
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--peek", action="store_true", help="stream a few rows, no download")
    ap.add_argument("--stats", action="store_true", help="summarise a downloaded copy")
    ap.add_argument("-n", type=int, default=5)
    a = ap.parse_args()
    sys.exit(peek(a.n) if a.peek else stats() if a.stats else download())
