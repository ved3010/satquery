"""Download the ESA WorldCover tiles covering the IndiaSat regions.

~134 MB per tile, 7 tiles, ~6 min total at the measured 2.5 MB/s.
Resumable: an existing complete file is skipped.

Licence CC-BY-4.0 -- attribute "ESA WorldCover project 2021 / Contains
modified Copernicus Sentinel data (2021) processed by ESA WorldCover consortium".
"""
from __future__ import annotations

import os
import sys
import time
import urllib.request

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from data.india import REGIONS, worldcover_tiles  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "data", "worldcover")
URL = ("https://esa-worldcover.s3.eu-central-1.amazonaws.com/v200/2021/map/"
       "ESA_WorldCover_10m_2021_v200_{tile}_Map.tif")


def fetch(tile: str) -> str:
    os.makedirs(OUT, exist_ok=True)
    dest = os.path.join(OUT, f"{tile}.tif")
    url = URL.format(tile=tile)

    expected = int(urllib.request.urlopen(
        urllib.request.Request(url, method="HEAD"), timeout=60
    ).headers["Content-Length"])

    if os.path.exists(dest) and os.path.getsize(dest) == expected:
        print(f"  {tile}  already complete ({expected/1e6:.0f} MB)")
        return dest

    # Download to .part then rename, so an interrupted run never leaves a
    # truncated file that looks valid to the next one.
    part = dest + ".part"
    have = os.path.getsize(part) if os.path.exists(part) else 0
    req = urllib.request.Request(url)
    if have:
        req.add_header("Range", f"bytes={have}-")
