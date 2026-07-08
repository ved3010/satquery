"""
Fetch live Sentinel imagery for a user-drawn area of interest.

The map console draws a rectangle; this turns it into real, co-registered
imagery the agent can analyse:

    bbox  ->  STAC search (Earth Search, keyless)
          ->  Sentinel-2 L2A window   (12 bands, optical)
          ->  Sentinel-1 GRD window   (VV/VH, SAR)      [optional]
          ->  Sentinel-2 at an earlier date             [optional, bi-temporal]

Each fetch writes two files per image, sharing a stem:

    <stem>.tif   8-bit RGB GeoTIFF -- georeferenced, PIL-readable, and what the
                 UI displays. This is the `path` handed to the agent.
    <stem>.npz   the full 12-band S2 (+2-band S1) float stack, for the models
                 that consume all bands.

Two files rather than one because the trained specialists need 12 bands, while
M2's ONNX graph and every image viewer expect 3. Keeping the stem shared means
a tool can find the full stack from the path it was given, without a registry.
"""
from __future__ import annotations

import json
import os
import time
import urllib.request
from typing import Any

import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
AOI_DIR = os.path.join(ROOT, "data", "aoi_fetch")
STAC = "https://earth-search.aws.element84.com/v1/search"

# The same 12 bands, in the same order, that the trained models expect. A band
# missing from a scene becomes a zero channel rather than shifting every later
# index — silently reordering would be far worse than one dead channel.
S2_BANDS = ["coastal", "blue", "green", "red", "rededge1", "rededge2",
            "rededge3", "nir", "nir08", "nir09", "swir16", "swir22"]
S1_BANDS = ["vv", "vh"]
MAX_PX = 1024          # cap the fetch so one careless drag cannot pull a whole scene

os.environ.setdefault("GDAL_DISABLE_READDIR_ON_OPEN", "EMPTY_DIR")
os.environ.setdefault("AWS_NO_SIGN_REQUEST", "YES")
os.environ.setdefault("GDAL_HTTP_MAX_RETRY", "3")
os.environ.setdefault("VSI_CACHE", "TRUE")


def _stac(collection: str, geom: dict, start: str, end: str,
          extra: dict | None = None, limit: int = 20) -> list[dict]:
    body: dict[str, Any] = {"collections": [collection], "intersects": geom,
                            "datetime": f"{start}T00:00:00Z/{end}T23:59:59Z",
                            "limit": limit}
    if extra:
        body["query"] = extra
    req = urllib.request.Request(STAC, data=json.dumps(body).encode(),
                                 headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=90) as r:
        return json.load(r)["features"]


def _bbox_geom(bbox: list[float]) -> dict:
    w, s, e, n = bbox
    return {"type": "Polygon",
            "coordinates": [[[w, s], [e, s], [e, n], [w, n], [w, s]]]}


INDEX_FILE = os.path.join(AOI_DIR, "index.json")


def _load_index() -> list[dict]:
    if os.path.exists(INDEX_FILE):
        try:
            with open(INDEX_FILE) as f:
                return json.load(f)
        except Exception:
            return []
    return []


def _save_index(entries: list[dict]):
    try:
        with open(INDEX_FILE, "w") as f:
            json.dump(entries, f, indent=2)
    except Exception:
        pass


def _window_for(href: str, bbox: list[float], strict: bool = True):
    """Pixel window covering `bbox` inside the raster at `href`."""
    import rasterio
    from rasterio.warp import transform as warp_transform
    from rasterio.windows import Window

    w, s, e, n = bbox
    with rasterio.open(href) as ds:
        xs, ys = warp_transform("EPSG:4326", ds.crs, [w, e], [s, n])
        r1, c1 = ds.index(xs[0], ys[1])       # top-left  (west, north)
        r2, c2 = ds.index(xs[1], ys[0])       # bottom-right
        row, col = min(r1, r2), min(c1, c2)
        h, wd = abs(r2 - r1), abs(c2 - c1)
        if h < 24 or wd < 24:
            return None, "AOI is too small — draw a larger box (min ~250 m)"
        if h > MAX_PX or wd > MAX_PX:
            return None, (f"AOI is too large ({wd}x{h} px at 10 m). "
                          f"Draw a box under ~{MAX_PX//100} km a side.")
        if row < 0 or col < 0 or row + h > ds.height or col + wd > ds.width:
