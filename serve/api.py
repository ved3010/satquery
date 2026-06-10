"""
FastAPI service fronting the agent graph.

The Next.js dashboard in satquery/ talks to this over HTTP. Clean separation:
the dashboard owns presentation, this owns orchestration and inference. No
rewrite of the existing frontend is needed.

Run:
    uvicorn serve.api:app --reload --port 8000
"""
from __future__ import annotations

import os
import re
import shutil
import tempfile
import uuid
from typing import Any
from urllib.parse import quote

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel

from agent.graph import answer as run_agent
from agent.registry import REGISTRY, assert_mandatory_coverage

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
UPLOADS = os.path.join(ROOT, "data", "uploads")
os.makedirs(UPLOADS, exist_ok=True)

# Formats the PS defines: GeoTIFF/TIFF for geospatial, PNG/JPEG only for the
