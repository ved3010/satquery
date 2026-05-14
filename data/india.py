"""
IndiaSat — a 100% Indian remote-sensing image-text dataset, built to the
BigEarthNet.txt recipe.

WHY THIS EXISTS
---------------
BigEarthNet.txt contains **zero** Indian data. Measured, not assumed:

    countries = Austria, Belgium, Finland, Ireland, Kosovo, Lithuania,
                Luxembourg, Portugal, Serbia, Switzerland
    rows with country == "India" ...................... 0
    rows inside India's bounding box (6-36N, 68-98E) ... 0
    latitude range  36.96 .. 67.98   (India: 6 .. 36)
    longitude range -8.99 .. 31.59   (India: 68 .. 98)

The ranges do not even overlap. There is no India subset to filter out.

ROOT CAUSE: BigEarthNet's labels come from CORINE Land Cover, which is a
European-only product. That is *why* the archive is European. Swap CORINE for
**ESA WorldCover** -- 10 m, global, free, CC-BY-4.0 -- and the same recipe
produces an Indian equivalent.

    Sentinel-2 L2A  (optical, 12 band)  <- Earth Search STAC, keyless
    Sentinel-1 GRD  (SAR, VV/VH)        <- Earth Search STAC, keyless
    ESA WorldCover  (labels, 11 class)  <- public S3, keyless

No account or API key is required for any of the three.

PS 26167 permits this: "At least one visual or vision-language component must
be fine-tuned or otherwise adapted using BigEarthNet.txt **or the any open
source training data**."
"""
from __future__ import annotations

from dataclasses import dataclass

# --------------------------------------------------------------------------- #
# ESA WorldCover v200 class map (11 classes)
# --------------------------------------------------------------------------- #
WORLDCOVER: dict[int, str] = {
    10: "tree cover",
    20: "shrubland",
    30: "grassland",
    40: "cropland",
    50: "built-up",
    60: "bare or sparse vegetation",
    70: "snow and ice",
    80: "permanent water bodies",
    90: "herbaceous wetland",
    95: "mangroves",
    100: "moss and lichen",
}

# Plural/verb agreement for caption templates. WorldCover names are a mix of
# mass nouns ("tree cover") and plurals ("mangroves"), so a naive template
# produces "mangroves covers 12%". This table keeps the grammar right.
PLURAL: dict[int, bool] = {
    10: False, 20: False, 30: False, 40: False, 50: False,
    60: False, 70: False, 80: True, 90: False, 95: True, 100: False,
}


@dataclass(frozen=True)
class Region:
    """One Indian sampling region.

    Regions are chosen to span the agro-climatic diversity that BigEarthNet
    lacks entirely -- tropical wet, arid desert, monsoon floodplain, montane,
    coastal mangrove. That spread is the whole point: a model adapted only on
    temperate/cold Europe has never seen any of it, and ISRO evaluates on
    Indian scenes.
    """
    key: str
    name: str
    state: str
    lat: float
    lon: float
    climate_zone: str          # Koppen description, BigEarthNet.txt phrasing
    landscape: str             # short descriptor used in captions
    season: str                # best cloud-free window

    @property
    def worldcover_tile(self) -> str:
        """ESA WorldCover tiles are 3x3 degrees, named by their SW corner."""
        la = int(self.lat // 3) * 3
        lo = int(self.lon // 3) * 3
        return f"{'N' if la >= 0 else 'S'}{abs(la):02d}{'E' if lo >= 0 else 'W'}{abs(lo):03d}"

    @property
    def worldcover_url(self) -> str:
        return ("https://esa-worldcover.s3.eu-central-1.amazonaws.com/v200/2021/map/"
                f"ESA_WorldCover_10m_2021_v200_{self.worldcover_tile}_Map.tif")

    def bbox(self, half_deg: float = 0.35) -> list[float]:
        return [self.lon - half_deg, self.lat - half_deg,
                self.lon + half_deg, self.lat + half_deg]


# Eight regions spanning India's climatic range. Every Koppen zone here is
# absent from BigEarthNet.txt, which contains only Cold and Temperate.
REGIONS: list[Region] = [
    Region("ahmedabad", "Ahmedabad", "Gujarat", 23.03, 72.58,
           "Arid, steppe, hot", "semi-arid urban and irrigated cropland", "winter"),
    Region("ludhiana", "Ludhiana", "Punjab", 30.90, 75.85,
           "Arid, steppe, hot", "intensively irrigated alluvial cropland", "winter"),
    Region("kochi", "Kochi", "Kerala", 9.93, 76.27,
           "Tropical, monsoon", "tropical coastal backwater and plantation", "winter"),
    Region("sundarbans", "Sundarbans", "West Bengal", 21.95, 88.90,
           "Tropical, savannah", "tidal mangrove delta", "winter"),
    Region("jaisalmer", "Jaisalmer", "Rajasthan", 26.91, 70.92,
           "Arid, desert, hot", "sandy desert with sparse vegetation", "winter"),
    Region("guwahati", "Guwahati", "Assam", 26.14, 91.73,
           "Humid subtropical", "Brahmaputra monsoon floodplain", "winter"),
    Region("pune", "Pune", "Maharashtra", 18.52, 73.86,
           "Tropical, savannah", "Deccan plateau mixed agriculture", "winter"),
    Region("shimla", "Shimla", "Himachal Pradesh", 31.10, 77.17,
           "Temperate, dry winter, warm summer", "montane forest and snow", "autumn"),
]

REGION_BY_KEY = {r.key: r for r in REGIONS}


def worldcover_tiles() -> list[str]:
    """Unique WorldCover tiles needed to cover every region (~134 MB each)."""
    return sorted({r.worldcover_tile for r in REGIONS})


# --------------------------------------------------------------------------- #
# Sentinel-2 band set
# --------------------------------------------------------------------------- #
# The 12 bands BigEarthNet uses, in its channel order. B10 (cirrus) is absent
# from L2A products, which is why BigEarthNet is 12-band and not 13.
S2_BANDS = ["coastal", "blue", "green", "red", "rededge1", "rededge2",
            "rededge3", "nir", "nir08", "nir09", "swir16", "swir22"]

# Earth Search asset keys -> native ground sample distance (m). Patches are
# extracted at 10 m, so 20 m and 60 m bands are upsampled -- same convention
# BigEarthNet follows.
S2_BAND_GSD = {"coastal": 60, "blue": 10, "green": 10, "red": 10,
               "rededge1": 20, "rededge2": 20, "rededge3": 20, "nir": 10,
               "nir08": 20, "nir09": 60, "swir16": 20, "swir22": 20}

S1_BANDS = ["vv", "vh"]

PATCH_PX = 120          # 120 x 120 at 10 m = 1.2 km, matching BigEarthNet


def label_fractions(arr) -> dict[int, float]:
    """Fraction of a label patch occupied by each WorldCover class."""
    import numpy as np
    vals, counts = np.unique(arr, return_counts=True)
    return {int(v): float(c) / arr.size for v, c in zip(vals, counts)}


def multilabel(fractions: dict[int, float], min_frac: float = 0.05) -> list[int]:
    """Classes present above a coverage floor.

    The 5% floor mirrors BigEarthNet's own practice: without it, single stray
    pixels from resampling boundaries become 'present' labels and the
    multilabel target turns to noise.
    """
    return sorted([c for c, f in fractions.items() if f >= min_frac and c in WORLDCOVER],
                  key=lambda c: -fractions[c])


def describe(class_id: int, capitalise: bool = False) -> str:
    name = WORLDCOVER.get(class_id, f"class {class_id}")
    return name[0].upper() + name[1:] if capitalise else name


def verb(class_id: int) -> str:
    """'cover' vs 'covers', matching the class's plurality."""
    return "cover" if PLURAL.get(class_id, False) else "covers"
