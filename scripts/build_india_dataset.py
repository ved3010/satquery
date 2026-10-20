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
    # the sample set, so losing it would remove a whole climate zone.
    s2 = None
    for wp in (window_px, window_px // 2, window_px // 4, PATCH_PX * 2):
        s2, rc = pick_scene(feats, region, wp,
                            lambda f: f["properties"]["eo:cloud_cover"])
        if s2 is not None:
            if wp != window_px:
                print(f"  ! no {window_px}px window fits; using {wp}px")
            window_px = wp
            break
    if s2 is None:
        print(f"  ! {len(feats)} scenes matched but none contains even a "
              f"{PATCH_PX*2}px window around the AOI")
        return 0, []
    print(f"  S2 {s2['id']}  {s2['properties']['datetime'][:10]}  "
          f"cloud {s2['properties']['eo:cloud_cover']:.1f}%")

    # --- read the S2 block, band by band, one window each ------------------ #
    t0 = time.time()
    row, col = rc
    with rasterio.open(s2["assets"]["red"]["href"]) as ref:
        half = window_px // 2
        win = Window(col - half, row - half, window_px, window_px)
        dst_transform = ref.window_transform(win)
        dst_crs = ref.crs
        H, W = int(win.height), int(win.width)

    with rasterio.open(s2["assets"]["red"]["href"]) as _r:
        refw = _r.width
    cube = read_s2_block(s2, win, H, W, refw)
    print(f"    S2 block {cube.shape} in {time.time()-t0:.0f}s")

    # --- optional second date, for bi-temporal change analysis (M5) -------- #
    cube_t2 = None
    if start2 and end2:
        f2 = stac("sentinel-2-l2a", point(region), start2, end2,
                  {"eo:cloud_cover": {"lt": max_cloud}})
        s2b, rc2 = pick_scene(f2, region, window_px,
                              lambda f: f["properties"]["eo:cloud_cover"])
        if s2b is None:
            print("  ! no usable second-date scene (patches stay single-date)")
        elif s2b["id"] == s2["id"]:
            print("  ! second-date search returned the same scene")
        else:
            r2, c2 = rc2
            with rasterio.open(s2b["assets"]["red"]["href"]) as ref2:
                half2 = window_px // 2
                win2 = Window(c2 - half2, r2 - half2, window_px, window_px)
                refw2 = ref2.width
            t1 = time.time()
            cube_t2 = read_s2_block(s2b, win2, H, W, refw2)
            print(f"  S2(t2) {s2b['id']}  {s2b['properties']['datetime'][:10]}  "
                  f"cloud {s2b['properties']['eo:cloud_cover']:.1f}%  "
                  f"({time.time()-t1:.0f}s)")

    # --- Sentinel-1 VV/VH over the same footprint -------------------------- #
    sar = None
    if want_sar:
        sfeats = stac("sentinel-1-grd", point(region), start, end)
        if sfeats:
            s1 = sfeats[0]
            sar = np.zeros((len(S1_BANDS), H, W), dtype=np.float32)
            got = 0
            for i, b in enumerate(S1_BANDS):
                href = s1["assets"].get(b, {}).get("href")
                if not href:
                    continue
                try:
                    with rasterio.open(href) as ds:
                        reproject(rasterio.band(ds, 1), sar[i],
                                  dst_transform=dst_transform, dst_crs=dst_crs,
                                  resampling=Resampling.bilinear)
                    got += 1
                except Exception as exc:
                    print(f"    S1 {b} failed: {type(exc).__name__}")
            if got:
                print(f"  S1 {s1['id']}  {s1['properties']['datetime'][:10]}  "
                      f"{got}/{len(S1_BANDS)} pol")
            else:
                sar = None
        else:
            print("  ! no Sentinel-1 scene in window (optical-only patches)")

    # --- WorldCover reprojected once onto the S2 grid ---------------------- #
    lab_block = np.zeros((H, W), dtype=np.uint8)
    with rasterio.open(wc_path) as wc:
        reproject(rasterio.band(wc, 1), lab_block,
                  dst_transform=dst_transform, dst_crs=dst_crs,
                  resampling=Resampling.nearest)   # nearest: labels, not values

    # --- cut patches ------------------------------------------------------- #
    os.makedirs(os.path.join(OUT, "patches"), exist_ok=True)
    n_patch = 0
    rows: list[dict] = []
    ny, nx = H // PATCH_PX, W // PATCH_PX
    for gy in range(ny):
        for gx in range(nx):
            sy, sx = gy * PATCH_PX, gx * PATCH_PX
            lab = lab_block[sy:sy+PATCH_PX, sx:sx+PATCH_PX]
            img = cube[:, sy:sy+PATCH_PX, sx:sx+PATCH_PX]

            # Skip no-data patches: an all-zero optical patch is scene edge or
            # cloud mask, and a labelless patch cannot be annotated.
            if (img == 0).all() or (lab == 0).all():
                continue
            valid = sum(f for c, f in
                        ((int(v), n / lab.size)
                         for v, n in zip(*np.unique(lab, return_counts=True)))
                        if c in WORLDCOVER)
            if valid < 0.90:                     # mostly unmapped -> drop
                continue

            pid = f"IND_{region.key}_{gy:03d}{gx:03d}"
            blob = {"s2": img, "label": lab}
            if sar is not None:
                blob["s1"] = sar[:, sy:sy+PATCH_PX, sx:sx+PATCH_PX]
            if cube_t2 is not None:
                t2 = cube_t2[:, sy:sy+PATCH_PX, sx:sx+PATCH_PX]
                if not (t2 == 0).all():
                    blob["s2_t2"] = t2
            np.savez_compressed(os.path.join(OUT, "patches", f"{pid}.npz"), **blob)

            # Deterministic split by grid position, so re-running is stable and
            # neighbouring patches (which overlap in content) cannot straddle
            # train and test.
            h = (gy * 7919 + gx * 104729) % 100
            split = "train" if h < 70 else "validation" if h < 85 else "test"
            rows += annotate_patch(lab, region, pid,
                                   s1["id"] if sar is not None else "",
                                   region.lat, region.lon, split,
                                   seed=gy * 1000 + gx)
            n_patch += 1

    print(f"  -> {n_patch} patches, {len(rows)} annotations")
    return n_patch, rows


def _to_crs(lon: float, lat: float, crs):
    from rasterio.warp import transform
    xs, ys = transform("EPSG:4326", crs, [lon], [lat])
    return xs[0], ys[0]


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--window", type=int, default=1200,
                    help="pixels per side of the block read per region "
                         "(1200 = 12x12 km = up to 100 patches)")
    ap.add_argument("--regions", default="all")
    ap.add_argument("--start", default="2024-01-01")
    ap.add_argument("--end", default="2024-04-30")
    ap.add_argument("--max-cloud", type=int, default=15)
    ap.add_argument("--no-sar", action="store_true")
    ap.add_argument("--start2", default=None, help="second-date start (bi-temporal)")
    ap.add_argument("--end2", default=None)
    a = ap.parse_args()

    regions = (REGIONS if a.regions == "all"
               else [REGION_BY_KEY[k] for k in a.regions.split(",")])
    os.makedirs(OUT, exist_ok=True)

    all_rows: list[dict] = []
    total_patches = 0
    for r in regions:
        print(f"\n=== {r.name}, {r.state} ({r.climate_zone}) ===")
        try:
            n, rows = build_region(r, a.window, a.start, a.end,
                                   a.max_cloud, not a.no_sar, a.start2, a.end2)
            total_patches += n
            all_rows += rows
        except Exception as exc:
            print(f"  ! {type(exc).__name__}: {exc}")

    if all_rows:
        import pyarrow as pa
        import pyarrow.parquet as pq
        tb = pa.Table.from_pylist(all_rows)
        dest = os.path.join(OUT, "IndiaSat.txt.parquet")
        pq.write_table(tb, dest)
        print(f"\n{total_patches} patches, {len(all_rows)} annotations")
        print(f"parquet -> {dest}")
