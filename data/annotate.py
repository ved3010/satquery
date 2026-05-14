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
