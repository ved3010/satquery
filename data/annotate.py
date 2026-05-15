"""
Generate BigEarthNet.txt-style annotations from ESA WorldCover label patches.

Formats are copied from the real dataset (sampled from the 9.55 M-row parquet)
so an IndiaSat row is schema-compatible with a BigEarthNet.txt row and the two
can be concatenated into one training mix:

  captioning   "This satellite image, captured during the winter season in
                India, showcases a ... landscape within the "..." climate zone."
  binary       "Would you say that any cropland lies next to built-up ...?" -> yes/no
  mcq          "Which classes share a boundary? a) ... b) ..."              -> a|b|c|d
  bounding box "Provide a bounding box for the land cover class instance at
                <point>(0.82, 0.28)</point>"                    -> [x0 y0, x1 y1]

Emitted columns match the parquet exactly:
    ID s1_name patch_id input output type category split
    latitude longitude country season climate_zone

Everything is derived from the label raster, so annotations are exactly as
correct as WorldCover is -- no model in the loop, nothing hallucinated.
"""
from __future__ import annotations

import random
from typing import Any, Iterator

import numpy as np

from data.india import WORLDCOVER, describe, verb

# 10 m pixels -> a 120x120 patch is 1.2 km a side = 1,440,000 m^2
PIXEL_AREA_M2 = 100


# --------------------------------------------------------------------------- #
# geometry helpers
# --------------------------------------------------------------------------- #
def adjacency_pairs(lab: np.ndarray) -> set[tuple[int, int]]:
    """Unordered class pairs that share a 4-connected pixel boundary."""
    pairs: set[tuple[int, int]] = set()
    for a, b in ((lab[:, :-1], lab[:, 1:]), (lab[:-1, :], lab[1:, :])):
        m = a != b
        for x, y in zip(a[m].ravel(), b[m].ravel()):
            x, y = int(x), int(y)
            if x in WORLDCOVER and y in WORLDCOVER:
                pairs.add((min(x, y), max(x, y)))
    return pairs


def largest_component_bbox(lab: np.ndarray, cls: int) -> tuple[float, float, float, float] | None:
    """Normalised bbox of the largest connected blob of `cls`.

    Uses a simple iterative flood fill rather than scipy.ndimage so the builder
    has no SciPy dependency -- it runs on Kaggle and on a bare laptop alike.
    """
    mask = lab == cls
    if not mask.any():
        return None
    h, w = mask.shape
    seen = np.zeros_like(mask, dtype=bool)
    best: tuple[int, list[int]] = (0, [0, 0, 0, 0])

    for sy in range(h):
        for sx in range(w):
            if not mask[sy, sx] or seen[sy, sx]:
                continue
            stack = [(sy, sx)]
            seen[sy, sx] = True
            y0 = y1 = sy
            x0 = x1 = sx
            size = 0
            while stack:
                cy, cx = stack.pop()
                size += 1
                y0, y1 = min(y0, cy), max(y1, cy)
                x0, x1 = min(x0, cx), max(x1, cx)
                for ny, nx in ((cy-1, cx), (cy+1, cx), (cy, cx-1), (cy, cx+1)):
                    if 0 <= ny < h and 0 <= nx < w and mask[ny, nx] and not seen[ny, nx]:
                        seen[ny, nx] = True
                        stack.append((ny, nx))
            if size > best[0]:
                best = (size, [y0, y1, x0, x1])

    if best[0] < 25:                      # ignore specks: <25 px of 14,400
        return None
    y0, y1, x0, x1 = best[1]
    # Fragmented land cover makes the largest component's bbox sprawl across
    # the whole frame -- a box covering 95% of the image teaches a grounding
    # model nothing and inflates IoU scores for free. Drop those.
    if ((y1 - y0 + 1) * (x1 - x0 + 1)) / (h * w) > 0.85:
        return None
    return (round(x0 / w, 2), round(y0 / h, 2),
            round((x1 + 1) / w, 2), round((y1 + 1) / h, 2))


# --------------------------------------------------------------------------- #
# annotation generators
# --------------------------------------------------------------------------- #
def caption(fr: dict[int, float], region, rng: random.Random) -> str:
    ranked = sorted(((c, f) for c, f in fr.items() if c in WORLDCOVER),
                    key=lambda x: -x[1])
    if not ranked:
        return ""
    dom, dom_f = ranked[0]
    rest = [(c, f) for c, f in ranked[1:] if f >= 0.05]

    s = (f'This satellite image, captured during the {region.season} season in '
         f'India ({region.name}, {region.state}), showcases a predominantly '
         f'{describe(dom)} landscape within the "{region.climate_zone}" climate '
         f'zone. {describe(dom, True)} {verb(dom)} approximately '
