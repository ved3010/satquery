"""
Build IndiaSat: co-registered Sentinel-2 + Sentinel-1 + WorldCover patches over
India, with BigEarthNet.txt-schema annotations.

    python scripts/build_india_dataset.py --window 1200 --regions all

Pipeline per region:
  1. STAC search Earth Search for the least-cloudy Sentinel-2 L2A scene
  2. STAC search the nearest-in-time Sentinel-1 GRD scene (same footprint)
  3. Read ONE large window per band over HTTP (COG range requests)
  4. Reproject the local WorldCover tile ONCE onto the S2 grid
  5. Cut the aligned block into 120x120 patches
  6. Generate annotations from the label patch

Reading one big window per band and cutting locally is what makes this feasible
on a slow link: a per-patch fetch would issue thousands of range requests, and
at the measured 2.5 MB/s that is hours instead of minutes.

Sources are keyless -- no Copernicus or AWS account needed:
    Sentinel-2 L2A, Sentinel-1 GRD  Earth Search (Element84) STAC
    ESA WorldCover v200 2021        public S3, downloaded by fetch_worldcover.py
"""
from __future__ import annotations

import argparse
import json
import os
import sys
import time
import urllib.request

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from data.india import (PATCH_PX, REGIONS, REGION_BY_KEY, S1_BANDS,  # noqa: E402
                        S2_BANDS, WORLDCOVER)
from data.annotate import annotate_patch  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "data", "indiasat")
WC_DIR = os.path.join(ROOT, "data", "worldcover")
STAC = "https://earth-search.aws.element84.com/v1/search"

os.environ.setdefault("GDAL_DISABLE_READDIR_ON_OPEN", "EMPTY_DIR")
os.environ.setdefault("AWS_NO_SIGN_REQUEST", "YES")
os.environ.setdefault("GDAL_HTTP_MAX_RETRY", "5")
os.environ.setdefault("GDAL_HTTP_RETRY_DELAY", "2")
os.environ.setdefault("VSI_CACHE", "TRUE")


def stac(collection: str, geom, start: str, end: str, extra=None, limit=20):
    """Search Earth Search. `geom` is a GeoJSON geometry, not a bbox.

    A bbox search returns every scene whose *footprint* overlaps the box, but
    Sentinel-2 tiles are 110 km squares and the AOI can sit outside the returned
    tile entirely -- which produced `WindowError: Intersection is empty` with
    col_off=13684 against a width of 10980. Intersecting an explicit Point
    guarantees every hit actually contains the AOI.
    """
    body = {"collections": [collection], "intersects": geom,
            "datetime": f"{start}T00:00:00Z/{end}T23:59:59Z", "limit": limit}
    if extra:
        body["query"] = extra
    req = urllib.request.Request(STAC, data=json.dumps(body).encode(),
                                 headers={"Content-Type": "application/json"})
    return json.load(urllib.request.urlopen(req, timeout=120))["features"]


def point(region):
    return {"type": "Point", "coordinates": [region.lon, region.lat]}


def pick_scene(feats, region, window_px, sort_key):
    """First candidate scene whose raster actually contains the AOI window.

    Even with an intersects-Point search a scene can still fail: the orbit swath
    may cover only part of the tile, leaving the AOI in nodata. So we open each
    candidate and check the window is genuinely in bounds before committing.
    """
    import rasterio
    for f in sorted(feats, key=sort_key):
        href = f["assets"].get("red", {}).get("href")
        if not href:
            continue
        try:
            with rasterio.open(href) as ref:
                x, y = _to_crs(region.lon, region.lat, ref.crs)
                row, col = ref.index(x, y)
                half = window_px // 2
                if (0 <= col - half and col + half <= ref.width and
                        0 <= row - half and row + half <= ref.height):
                    return f, (row, col)
        except Exception:
            continue
    return None, None


def read_s2_block(scene, win, H, W, refw):
    """Read every S2 band for one window into a (12, H, W) uint16 cube."""
    import rasterio
    from rasterio.warp import Resampling
    from rasterio.windows import Window

    cube = np.zeros((len(S2_BANDS), H, W), dtype=np.uint16)
    for i, b in enumerate(S2_BANDS):
        href = scene["assets"].get(b, {}).get("href")
        if not href:
            continue
        with rasterio.open(href) as ds:
            # 20 m / 60 m bands sit on a coarser grid; out_shape resamples them
            # onto the 10 m patch grid, as BigEarthNet does.
            scale = ds.width / refw
            sw = Window(win.col_off * scale, win.row_off * scale,
                        win.width * scale, win.height * scale)
            cube[i] = ds.read(1, window=sw, out_shape=(H, W),
                              resampling=Resampling.bilinear,
                              boundless=True, fill_value=0)
    return cube


def ndvi(cube):
    """(NIR - Red) / (NIR + Red) from the 12-band cube. Bands 7=nir, 3=red."""
    nir = cube[7].astype(np.float32)
    red = cube[3].astype(np.float32)
    return (nir - red) / (nir + red + 1e-6)


def build_region(region, window_px: int, start: str, end: str,
                 max_cloud: int, want_sar: bool,
                 start2: str | None = None, end2: str | None = None) -> tuple[int, int]:
    import rasterio
    from rasterio.warp import Resampling, reproject
    from rasterio.windows import Window

    wc_path = os.path.join(WC_DIR, f"{region.worldcover_tile}.tif")
    if not os.path.exists(wc_path):
        print(f"  ! WorldCover tile {region.worldcover_tile} missing "
              f"— run scripts/fetch_worldcover.py")
        return 0, []

    feats = stac("sentinel-2-l2a", point(region), start, end,
                 {"eo:cloud_cover": {"lt": max_cloud}})
    if not feats:
        print(f"  ! no Sentinel-2 scene under {max_cloud}% cloud")
        return 0, []
    # A region near a tile edge may admit no full-size window. Shrink rather
    # than drop the region entirely -- Shimla is the only montane/snow site in
