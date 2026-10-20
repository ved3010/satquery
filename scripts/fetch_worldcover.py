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
        print(f"  {tile}  resuming at {have/1e6:.0f} MB")

    t0 = time.time()
    with urllib.request.urlopen(req, timeout=120) as r, open(part, "ab") as fh:
        while chunk := r.read(1 << 20):
            fh.write(chunk)
            have += len(chunk)
            pct = 100 * have / expected
            print(f"\r  {tile}  {have/1e6:6.0f}/{expected/1e6:.0f} MB  {pct:5.1f}%",
                  end="", flush=True)
    os.replace(part, dest)
    print(f"\r  {tile}  {expected/1e6:.0f} MB in {time.time()-t0:.0f}s"
          f"{' ':20}")
    return dest


if __name__ == "__main__":
    tiles = worldcover_tiles()
    print(f"ESA WorldCover v200 2021 -- {len(tiles)} tiles for "
          f"{len(REGIONS)} Indian regions\n")
    ok = 0
    for t in tiles:
        try:
            fetch(t)
            ok += 1
        except Exception as exc:                      # network, 404, disk
            print(f"\r  {t}  FAILED: {type(exc).__name__}: {exc}")
    total = sum(os.path.getsize(os.path.join(OUT, f))
                for f in os.listdir(OUT) if f.endswith(".tif"))
    print(f"\n{ok}/{len(tiles)} tiles, {total/1e6:.0f} MB in {OUT}")
