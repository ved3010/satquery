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
