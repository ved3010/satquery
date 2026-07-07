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
# prescribed public benchmarks.
ALLOWED_EXT = {".tif", ".tiff", ".png", ".jpg", ".jpeg"}
MAX_BYTES = 256 * 1024 * 1024

app = FastAPI(title="SatQuery AI", version="0.1.0",
              description="Agentic vision-language assistant for remote sensing (SIH PS 26167)")

# The site runs on :3001 in dev and on Vercel in production. A long AOI fetch
# is far more reliable spoken to directly than proxied through the Next dev
# server, which drops the connection on a slow upstream -- so the browser is
# allowed to call this service cross-origin rather than only same-origin.
#
# SATQUERY_ALLOWED_ORIGINS is a comma-separated list; set it to the deployed
# origin before exposing this service publicly.
_env_origins = [o.strip() for o in
                os.environ.get("SATQUERY_ALLOWED_ORIGINS", "").split(",")
                if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000",
                   "http://localhost:3001", "http://127.0.0.1:3001",
                   *_env_origins],
    # Vercel gives every deployment its own preview subdomain, so the
    # production origin cannot be enumerated ahead of time.
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)


class ImageRef(BaseModel):
    path: str
    modality: str | None = None       # "optical" | "sar"; inferred if omitted
    date: str | None = None


class QueryRequest(BaseModel):
    query: str
    images: list[ImageRef] = []
    thread_id: str | None = None


class AOIRequest(BaseModel):
    """A rectangle drawn on the map, plus what to fetch for it."""
    bbox: list[float]                      # [west, south, east, north] EPSG:4326
    start: str = "2024-01-01"
    end: str = "2024-12-31"
    max_cloud: int = 20
    want_sar: bool = True
    start2: str | None = None              # earlier window -> bi-temporal pair
    end2: str | None = None


STATIC = os.path.join(os.path.dirname(os.path.abspath(__file__)), "static")


@app.get("/")
def index():
    """Serve the test console at the API origin, so the page's fetch() calls
