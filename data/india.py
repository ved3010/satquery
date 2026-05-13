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
