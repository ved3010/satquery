"""Download the ESA WorldCover tiles covering the IndiaSat regions.

~134 MB per tile, 7 tiles, ~6 min total at the measured 2.5 MB/s.
Resumable: an existing complete file is skipped.

Licence CC-BY-4.0 -- attribute "ESA WorldCover project 2021 / Contains
modified Copernicus Sentinel data (2021) processed by ESA WorldCover consortium".
"""
from __future__ import annotations

import os
import sys
import time
import urllib.request

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from data.india import REGIONS, worldcover_tiles  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "data", "worldcover")
URL = ("https://esa-worldcover.s3.eu-central-1.amazonaws.com/v200/2021/map/"
       "ESA_WorldCover_10m_2021_v200_{tile}_Map.tif")
