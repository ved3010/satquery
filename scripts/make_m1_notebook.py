"""Generate the M1 Kaggle notebook (notebooks/M1_rsclip_indiasat.ipynb).

Kept as a generator rather than a hand-edited .ipynb so the shared logic
(regions, annotation rules) stays in one place and cannot drift from
data/india.py and data/annotate.py.
"""
from __future__ import annotations

import json
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def code(src: str) -> dict:
    return {"cell_type": "code", "execution_count": None, "metadata": {},
            "outputs": [], "source": src.strip("\n").split("\n")}


def md(src: str) -> dict:
    return {"cell_type": "markdown", "metadata": {},
            "source": src.strip("\n").split("\n")}


CELLS: list[dict] = []

CELLS.append(md("""
# M1 — RS-CLIP on **IndiaSat** (100% Indian imagery)

SIH 2026 · PS 26167 · ISRO/SAC

**Why this notebook exists.** BigEarthNet.txt contains **zero** Indian data —
measured, not assumed: 10 European countries, latitude 36.96–67.98N, longitude
8.99W–31.59E. India (6–36N, 68–98E) does not overlap it at all.

Root cause: BigEarthNet's labels come from **CORINE Land Cover**, a Europe-only
product. That is *why* the archive is European. Swapping CORINE for **ESA
WorldCover** (10 m, global, CC-BY-4.0) reproduces the same recipe over India.

PS 26167 permits this explicitly: *"adapted using BigEarthNet.txt **or the any
open source training data**"*.

**What M1 is.** A CLIP-style dual encoder trained contrastively on Indian
satellite image–caption pairs, so imagery and remote-sensing English share one
embedding space. Its frozen image tower becomes the backbone of M2, M3, M4 and
M6 — train once, reuse four times.

**Data sources — all keyless, no account needed:**

| source | what | licence |
|---|---|---|
| Earth Search (Element84) STAC | Sentinel-2 L2A, Sentinel-1 GRD | open |
| ESA WorldCover v200 2021 | 10 m land cover labels | CC-BY-4.0 |

**Runtime** ≈ 2–4 h on P100. Builds the dataset *on Kaggle*, where the link is
far faster than a laptop.

> ⚠️ **Use fp16, never bf16.** P100 is sm_60 and T4 is sm_75; bf16 needs Ampere
> (sm_80+) and crashes on the first step. The guard cell enforces this.
"""))

CELLS.append(md("## 0 · Environment guard"))
CELLS.append(code('''
import subprocess, torch
print(subprocess.run(["nvidia-smi", "--query-gpu=name,memory.total",
                      "--format=csv,noheader"], capture_output=True, text=True).stdout.strip())
assert torch.cuda.is_available(), \\
    "Enable GPU: notebook sidebar -> Settings -> Accelerator -> GPU (needs phone verification)"
cap = torch.cuda.get_device_capability()
BF16 = cap[0] >= 8
AMP_DTYPE = torch.bfloat16 if BF16 else torch.float16
print(f"torch {torch.__version__} | sm_{cap[0]}{cap[1]} | bf16 usable: {BF16}")
print("AMP dtype ->", AMP_DTYPE)
'''))

CELLS.append(code('!pip -q install rasterio pyarrow open_clip_torch 2>&1 | tail -2'))

CELLS.append(md("""
## 1 · Regions

Eight regions spanning the agro-climatic range BigEarthNet lacks entirely —
tropical monsoon, arid desert, savannah, humid subtropical floodplain, montane.
**Every Köppen zone here is absent from BigEarthNet.txt**, which contains only
Cold and Temperate.
"""))
CELLS.append(code('''
from dataclasses import dataclass

WORLDCOVER = {10:"tree cover", 20:"shrubland", 30:"grassland", 40:"cropland",
              50:"built-up", 60:"bare or sparse vegetation", 70:"snow and ice",
              80:"permanent water bodies", 90:"herbaceous wetland",
              95:"mangroves", 100:"moss and lichen"}
PLURAL = {10:False,20:False,30:False,40:False,50:False,60:False,
          70:False,80:True,90:False,95:True,100:False}

@dataclass(frozen=True)
class Region:
    key:str; name:str; state:str; lat:float; lon:float
    climate_zone:str; landscape:str; season:str
    @property
    def worldcover_tile(self):
        la, lo = int(self.lat//3)*3, int(self.lon//3)*3
        ns = "N" if la >= 0 else "S"; ew = "E" if lo >= 0 else "W"
        return f"{ns}{abs(la):02d}{ew}{abs(lo):03d}"
    @property
    def worldcover_url(self):
        return ("https://esa-worldcover.s3.eu-central-1.amazonaws.com/v200/2021/map/"
                f"ESA_WorldCover_10m_2021_v200_{self.worldcover_tile}_Map.tif")
    def bbox(self, h=0.35):
        return [self.lon-h, self.lat-h, self.lon+h, self.lat+h]

REGIONS = [
 Region("ahmedabad","Ahmedabad","Gujarat",23.03,72.58,"Arid, steppe, hot","semi-arid urban and irrigated cropland","winter"),
 Region("ludhiana","Ludhiana","Punjab",30.90,75.85,"Arid, steppe, hot","intensively irrigated alluvial cropland","winter"),
 Region("kochi","Kochi","Kerala",9.93,76.27,"Tropical, monsoon","tropical coastal backwater and plantation","winter"),
 Region("sundarbans","Sundarbans","West Bengal",21.95,88.90,"Tropical, savannah","tidal mangrove delta","winter"),
 Region("jaisalmer","Jaisalmer","Rajasthan",26.91,70.92,"Arid, desert, hot","sandy desert with sparse vegetation","winter"),
 Region("guwahati","Guwahati","Assam",26.14,91.73,"Humid subtropical","Brahmaputra monsoon floodplain","winter"),
 Region("pune","Pune","Maharashtra",18.52,73.86,"Tropical, savannah","Deccan plateau mixed agriculture","winter"),
 Region("shimla","Shimla","Himachal Pradesh",31.10,77.17,"Temperate, dry winter, warm summer","montane forest and snow","autumn"),
]
S2_BANDS = ["coastal","blue","green","red","rededge1","rededge2","rededge3",
            "nir","nir08","nir09","swir16","swir22"]
S1_BANDS = ["vv","vh"]
PATCH_PX = 120
print(len(REGIONS), "regions | tiles:", sorted({r.worldcover_tile for r in REGIONS}))
'''))

CELLS.append(md("## 2 · Fetch WorldCover tiles (~134 MB each)"))
CELLS.append(code('''
import os, time, urllib.request
WC = "/kaggle/working/worldcover"; os.makedirs(WC, exist_ok=True)
for tile in sorted({r.worldcover_tile for r in REGIONS}):
    dest = f"{WC}/{tile}.tif"
    if os.path.exists(dest):
        print(f"  {tile} cached"); continue
    url = next(r.worldcover_url for r in REGIONS if r.worldcover_tile == tile)
    t0 = time.time(); urllib.request.urlretrieve(url, dest)
    print(f"  {tile}  {os.path.getsize(dest)/1e6:.0f} MB in {time.time()-t0:.0f}s")
'''))

CELLS.append(md("""
## 3 · Caption generator

Format copied verbatim from the real BigEarthNet.txt parquet, so IndiaSat rows
are schema-compatible and the two corpora concatenate into one training mix.
"""))
CELLS.append(code('''
import random
import numpy as np

def describe(c, cap=False):
    n = WORLDCOVER.get(c, f"class {c}")
    return n[0].upper() + n[1:] if cap else n

def verb(c):
    return "cover" if PLURAL.get(c, False) else "covers"

CAPTION_PROMPTS = [
    "Describe the land cover visible in this satellite image.",
