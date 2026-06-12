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
    are same-origin and never hit CORS."""
    return FileResponse(os.path.join(STATIC, "index.html"))


@app.get("/health")
def health() -> dict[str, Any]:
    trained = [m for m, s in REGISTRY.items() if s.is_trained]
    return {
        "status": "ok",
        "models_registered": len(REGISTRY),
        "models_trained": trained,
        "mandatory_coverage": assert_mandatory_coverage(),
    }


@app.get("/models")
def models() -> list[dict[str, Any]]:
    """Registry contents — the dashboard renders this as the model panel."""
    return [{
        "id": s.id, "name": s.name, "version": s.version,
        "tasks": [t.value for t in s.tasks],
        "modalities": [m.value for m in s.modalities],
        "n_images": s.n_images, "runtime": s.runtime,
        "params_m": s.params_m, "trained": s.is_trained,
        "metrics": s.metrics, "notes": s.notes,
    } for s in REGISTRY.values()]


@app.post("/upload")
async def upload(file: UploadFile = File(...)) -> dict[str, Any]:
    """Store an uploaded image and return a path usable in /query.

    Validation is deliberately strict here rather than deep in the graph: the
    PS asks for "input upload and compatibility checking", and rejecting a bad
    file at the door produces a much clearer error than a failure mid-pipeline.
    """
    ext = os.path.splitext(file.filename or "")[1].lower()
    if ext not in ALLOWED_EXT:
        raise HTTPException(415, f"Unsupported format {ext!r}. "
                                 f"Allowed: {', '.join(sorted(ALLOWED_EXT))}")

    dest = os.path.join(UPLOADS, f"{uuid.uuid4().hex[:12]}{ext}")
    size = 0
    # Stream to a temp file so an oversized upload never lands in the store,
    # and cannot fill the disk before the size check runs.
    with tempfile.NamedTemporaryFile(delete=False, dir=UPLOADS) as tmp:
        while chunk := await file.read(1 << 20):
            size += len(chunk)
            if size > MAX_BYTES:
                tmp.close()
                os.unlink(tmp.name)
                raise HTTPException(413, f"File exceeds {MAX_BYTES // (1 << 20)} MB")
            tmp.write(chunk)
    shutil.move(tmp.name, dest)

    return {"path": dest, "filename": file.filename, "bytes": size,
            "modality": _guess_modality(file.filename or "")}


def _guess_modality(name: str) -> str | None:
    """Filename hint only — never authoritative.

    Real modality comes from GeoTIFF metadata during INGEST. This exists so the
    upload UI can pre-select a sensible dropdown value for the user to confirm.
    """
    low = name.lower()
    if any(k in low for k in ("s1", "sar", "risat", "grd", "vv", "vh")):
        return "sar"
    if any(k in low for k in ("s2", "optical", "cartosat", "msi", "rgb")):
        return "optical"
    return None


@app.post("/aoi/fetch")
def aoi_fetch(req: AOIRequest) -> dict[str, Any]:
    """Fetch live Sentinel imagery for a map-drawn area of interest.

    Returns image refs usable directly in /query, plus the scene provenance
    (product id, date, cloud cover) so the answer can cite what it looked at.
    """
    if len(req.bbox) != 4:
        raise HTTPException(400, "bbox must be [west, south, east, north]")
    w, s_, e, n = req.bbox
    if not (-180 <= w < e <= 180 and -90 <= s_ < n <= 90):
        raise HTTPException(400, "bbox is not a valid west/south/east/north box")

    from serve.aoi import fetch_aoi
    try:
        out = fetch_aoi(req.bbox, req.start, req.end, req.max_cloud,
                        req.want_sar, req.start2, req.end2)
    except Exception as exc:
        raise HTTPException(502, f"imagery fetch failed: {type(exc).__name__}: {exc}")
    if "error" in out:
        raise HTTPException(404, out["error"])

    # hand back preview URLs the browser can load
    for img in out["images"]:
        img["preview"] = "/preview?path=" + quote(img["path"])
    return out


@app.get("/geocode")
def geocode(q: str = "", limit: int = 8) -> list[dict[str, Any]]:
    """Fast pan-India location search and autosuggestions."""
    from serve.geocode import search_locations
    return search_locations(q, limit=limit)

