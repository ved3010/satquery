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
            if strict:
                return None, None
            # Clamp gracefully to raster boundaries
            c_row = max(0, min(row, ds.height - 32))
            c_col = max(0, min(col, ds.width - 32))
            c_h = max(32, min(h, ds.height - c_row))
            c_wd = max(32, min(wd, ds.width - c_col))
            win = Window(c_col, c_row, c_wd, c_h)
            return (win, ds.crs, ds.window_transform(win), ds.width), None
        return (Window(col, row, wd, h), ds.crs, ds.window_transform(
            Window(col, row, wd, h)), ds.width), None


def _pick(feats: list[dict], bbox: list[float], sort_key):
    """First scene that fully contains the AOI, or best overlap."""
    err = None
    for strict in (True, False):
        for f in sorted(feats, key=sort_key):
            href = f["assets"].get("red", {}).get("href") or \
                   f["assets"].get("vv", {}).get("href")
            if not href:
                continue
            try:
                got, e = _window_for(href, bbox, strict=strict)
            except Exception:
                continue
            if e:
                err = e                            # size complaint: report it
                break
            if got:
                return f, got, None
    return None, None, err


def _read_bands(scene: dict, bands: list[str], win, refw: int,
                out_hw: tuple[int, int], dtype, workers: int = 12) -> np.ndarray:
    """Read every band into one cube, fetching bands concurrently.

    Each band is a separate COG on S3, so the reads are independent and almost
    entirely network-bound. Serially this took ~240 s for a 4 km AOI over a
    2.5 MB/s link -- far too slow for someone drawing a box and waiting. Each
    thread opens its own dataset handle, which is the supported way to use
    rasterio concurrently.
    """
    from concurrent.futures import ThreadPoolExecutor

    import rasterio
    from rasterio.warp import Resampling
    from rasterio.windows import Window

    H, W = out_hw
    cube = np.zeros((len(bands), H, W), dtype=dtype)

    def grab(i_b):
        i, b = i_b
        href = scene["assets"].get(b, {}).get("href")
        if not href:
            return i, None
        with rasterio.open(href) as ds:
            sc = ds.width / refw
            sw = Window(win.col_off * sc, win.row_off * sc,
                        win.width * sc, win.height * sc)
            return i, ds.read(1, window=sw, out_shape=(H, W),
                              resampling=Resampling.bilinear,
                              boundless=True, fill_value=0)

    with ThreadPoolExecutor(max_workers=min(workers, len(bands))) as ex:
        for i, arr in ex.map(grab, list(enumerate(bands))):
            if arr is not None:
                cube[i] = arr
    return cube


def _stretch(band: np.ndarray, lo_pct=2.0, hi_pct=98.0) -> np.ndarray:
    """Percentile stretch to 8-bit for display.

    Sentinel-2 reflectance occupies a narrow slice of uint16, so a plain
    linear scale renders almost black. Percentile clipping is what makes the
    preview look like the satellite image a user expects.
