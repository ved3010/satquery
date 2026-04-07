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
