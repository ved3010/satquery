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
         f'{dom_f * 100:.0f}% of the scene')
    if rest:
        parts = [f"{describe(c)} ({f * 100:.0f}%)" for c, f in rest[:3]]
        s += ", alongside " + ", ".join(parts[:-1]) + (
            f" and {parts[-1]}" if len(parts) > 1 else parts[0])
    return s + "."


CAPTION_PROMPTS = [
    "Describe the land cover visible in this satellite image.",
    "Give a comprehensive overview of the image, specifying the location, climate, and landscape features.",
    "Explain the distribution of land cover in this image, including the geographic region and season.",
    "Provide a detailed scene description for this remote sensing image.",
]


def gen_binary(fr, pairs, region, rng) -> Iterator[tuple[str, str, str]]:
    """(question, answer, category) triples of type `binary`."""
    present = [c for c in fr if c in WORLDCOVER and fr[c] >= 0.05]
    # "Absent" must mean ZERO pixels, not merely below the 5% multilabel floor.
    # Using the floor here produced "Is grassland present? -> no" on a patch
    # that was 2.5% grassland -- a factually wrong label, and the kind of noise
    # that silently caps a VQA model's ceiling.
    absent = [c for c in WORLDCOVER if fr.get(c, 0.0) == 0.0]

    # presence -- balanced yes/no by construction
    if present:
        c = rng.choice(present)
        yield (f"Is {describe(c)} present in the image?", "yes", "presence")
    if absent:
        c = rng.choice(absent)
        yield (f"Is {describe(c)} present in the image?", "no", "presence")

    # adjacency
    if pairs:
        a, b = rng.choice(sorted(pairs))
        yield (f"Would you say that any {describe(a)} lies next to "
               f"{describe(b)} in the image?", "yes", "adjacency")
    if len(present) >= 2:
        for _ in range(6):                     # bounded search for a non-pair
            a, b = rng.sample(present, 2)
            if (min(a, b), max(a, b)) not in pairs:
                yield (f"Would you confirm that any {describe(a)} borders upon "
                       f"{describe(b)}?", "no", "adjacency")
                break

    # area -- ask about a real range, half the time offset to give a "no"
    if present:
        c = rng.choice(present)
        true_m2 = fr[c] * 14400 * PIXEL_AREA_M2
        lo = int(true_m2 // 144000) * 144000
        hi = lo + 144000
        if rng.random() < 0.5:
            yield (f"Do {describe(c)} cover between {lo} square meters and "
                   f"{hi} square meters of the image?", "yes", "area")
        else:
            yield (f"Do {describe(c)} cover between {lo + 288000} square meters "
                   f"and {hi + 288000} square meters of the image?", "no", "area")


def gen_mcq(fr, pairs, region, rng) -> Iterator[tuple[str, str, str]]:
    present = [c for c in fr if c in WORLDCOVER and fr[c] >= 0.05]

    # dominant class
    if present:
        ranked = sorted(present, key=lambda c: -fr[c])
        correct = describe(ranked[0], True)
        distract = [describe(c, True) for c in WORLDCOVER if c != ranked[0]]
        opts = rng.sample(distract, min(3, len(distract))) + [correct]
        rng.shuffle(opts)
        letters = "abcd"[:len(opts)]
        body = ", ".join(f"{l}) {o}" for l, o in zip(letters, opts))
        yield (f"Which land cover class dominates this satellite image? {body}",
               letters[opts.index(correct)], "presence")

    # climate zone -- directly transferable to the Indian evaluation set
    zones = ["Tropical, monsoon", "Tropical, savannah", "Arid, desert, hot",
             "Arid, steppe, hot", "Humid subtropical",
             "Temperate, dry winter, warm summer"]
    distract = [z for z in zones if z != region.climate_zone]
    opts = rng.sample(distract, 3) + [region.climate_zone]
    rng.shuffle(opts)
    letters = "abcd"
    body = ", ".join(f"{l}) {o}" for l, o in zip(letters, opts))
    yield (f"From the options below, choose the climate zone shown in the "
           f"satellite image: {body}",
           letters[opts.index(region.climate_zone)], "climate zone")

    # adjacency
    if pairs and len(WORLDCOVER) > 4:
        a, b = rng.choice(sorted(pairs))
        correct = f"{describe(a, True)} and {describe(b)}"
        opts = [correct]
        for _ in range(12):
            x, y = rng.sample(sorted(WORLDCOVER), 2)
            if (min(x, y), max(x, y)) not in pairs:
                cand = f"{describe(x, True)} and {describe(y)}"
                if cand not in opts:
                    opts.append(cand)
            if len(opts) == 4:
                break
        if len(opts) == 4:
            rng.shuffle(opts)
            body = ", ".join(f"{l}) {o}" for l, o in zip(letters, opts))
            yield (f"Which classes share a boundary? {body}",
                   letters[opts.index(correct)], "adjacency")


BBOX_PROMPTS = [
    "Provide a bounding box for the land cover class instance at <point>({x}, {y})</point> in the satellite image.",
    "Provide a bounding box surrounding the land cover class instance positioned at <point>({x}, {y})</point> in the image.",
    "Output a bounding box surrounding the land cover class instance positioned at <point>({x}, {y})</point> in the image.",
]


def gen_bbox(lab, fr, region, rng) -> Iterator[tuple[str, str, str]]:
    present = [c for c in fr if c in WORLDCOVER and fr[c] >= 0.08]
    rng.shuffle(present)
    for c in present[:3]:
        box = largest_component_bbox(lab, c)
        if box is None:
            continue
        x0, y0, x1, y1 = box
        px = round(rng.uniform(x0, x1), 2)
        py = round(rng.uniform(y0, y1), 2)
        # only keep the sample if the probe point really falls in this class,
        # otherwise the question and answer disagree
        iy = min(int(py * lab.shape[0]), lab.shape[0] - 1)
        ix = min(int(px * lab.shape[1]), lab.shape[1] - 1)
        if int(lab[iy, ix]) != c:
            continue
        yield (rng.choice(BBOX_PROMPTS).format(x=px, y=py),
               f"[{x0} {y0}, {x1} {y1}]", "point")

        yield (f"Provide a bounding box for the {describe(c)} region in the image.",
               f"[{x0} {y0}, {x1} {y1}]", "reference")


# --------------------------------------------------------------------------- #
def annotate_patch(lab: np.ndarray, region, patch_id: str, s1_name: str,
                   lat: float, lon: float, split: str,
                   seed: int = 0) -> list[dict[str, Any]]:
    """All annotations for one patch, as parquet-schema rows."""
    rng = random.Random(seed)
    fr = {int(v): float(c) / lab.size
          for v, c in zip(*np.unique(lab, return_counts=True))}
    pairs = adjacency_pairs(lab)

    base = {"s1_name": s1_name, "patch_id": patch_id, "split": split,
            "latitude": lat, "longitude": lon, "country": "India",
            "season": region.season, "climate_zone": region.climate_zone}
    rows: list[dict[str, Any]] = []

    cap = caption(fr, region, rng)
    if cap:
        rows.append({**base, "input": rng.choice(CAPTION_PROMPTS),
                     "output": cap, "type": "captioning", "category": None})

    for q, a, cat in gen_binary(fr, pairs, region, rng):
        rows.append({**base, "input": q, "output": a, "type": "binary", "category": cat})
    for q, a, cat in gen_mcq(fr, pairs, region, rng):
        rows.append({**base, "input": q, "output": a, "type": "mcq", "category": cat})
    for q, a, cat in gen_bbox(lab, fr, region, rng):
        rows.append({**base, "input": q, "output": a,
                     "type": "bounding box", "category": cat})
    return rows
