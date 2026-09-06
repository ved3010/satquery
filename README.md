<div align="center">

# 🛰️ SatQuery AI
### Autonomous Agentic Vision-Language Geospatial Intelligence

[![Python 3.9+](https://img.shields.io/badge/python-3.9+-blue.svg)](https://www.python.org/downloads/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.110+-009688.svg)](https://fastapi.tiangolo.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Sentinel-2 & Sentinel-1](https://img.shields.io/badge/Constellations-Sentinel--2%20%7C%20Sentinel--1%20SAR-brightgreen)](https://dataspace.copernicus.eu/)

*SatQuery is not another satellite-image classifier. It is an AI agent that decides how to analyze satellite data.*

</div>

---

## 🌟 The Core Paradigm

Traditional GIS workflows require remote sensing analysts to manually download gigabytes of imagery, apply atmospheric corrections, perform band calculations, execute classification, and write manual reports. 

Naive Vision-Language Models (VLMs) hallucinate numbers, cannot ingest 13-band 16-bit multi-spectral rasters, and have no coordinate grounding.

**SatQuery AI operates as an Autonomous Geospatial DAG Orchestrator:**
1. **Parses Natural Language Intent:** Extracts spatial coordinates (Pan-India & Global), time windows, and biophysical targets.
2. **Autonomous Tool DAG Compilation:** Selects optimal sensors (Sentinel-2 MSI, Sentinel-1 All-Weather SAR, Landsat-8/9) and compiles an executable tool graph.
3. **Deterministic Pixel Math:** Computes spectral indices (NDVI, NDWI, NBR, NDBI), Otsu adaptive change masks, and zonal surface areas.
4. **Zero-Hallucination Audit Trace:** Synthesizes actionable natural language answers with mathematical proofs and verifiable hashes.

```
User Query: "What changed in Western Ghats between 2020 and 2025?"
       ↓
1. Autonomous DAG Planner (Plan-and-Solve)
       ↓
2. STAC Cloud-Optimized Data Retrieval (Sentinel-2 L2A BOA Reflectances)
       ↓
3. SCL Cloud & Atmospheric Shadow Masking
       ↓
4. Biophysical Indices Engine (NDVI = (B08-B04)/(B08+B04))
       ↓
5. Bi-Temporal Change Vector Analysis & Otsu Adaptive Thresholding
       ↓
6. Zonal Statistics Geometry Engine (Exact km², hectares, % delta)
       ↓
7. Multimodal Evidence Synthesis + Interactive Split-Map + Audit Ledger
```

---

## 🚀 Key Features

- 🇮🇳 **Pan-India & Global Coverage:** Pre-configured scenarios covering the Western Ghats, Osman Sagar (Hyderabad), Bangalore Tech Corridor, Assam Brahmaputra Flood Plain (SAR), and Punjab Stubble Burning.
- 🌧️ **All-Weather Sentinel-1 SAR Radar:** Penetrates 100% monsoon cloud cover to map flood inundation and rice paddy moisture.
- 🛡️ **Zero-Hallucination Guarantee:** Language models *never* guess numbers; quantitative metrics come directly from verified pixel integral tools (`compute_zonal_statistics`).
- 🗺️ **Interactive Geospatial Dashboard:** Dual-screen comparison map, layer toggle (True Color RGB, False Color CIR, NDVI/NDWI, Change Masks), opacity swipe slider, and live DAG reasoning stream.
- ⚡ **Lightning Fast Async Architecture:** Sub-second tool execution with SSE real-time reasoning telemetry.

---

## 📦 Project Structure

```
Satquery/
├── satquery/
│   ├── main.py                  # FastAPI server & CLI runner
│   ├── config.py                # App configuration & STAC endpoints
│   ├── agent/
│   │   ├── planner.py           # Autonomous DAG Planner
│   │   ├── executor.py          # DAG Execution Engine & Raster Stacker
│   │   ├── synthesizer.py       # Grounded Evidence Synthesizer
│   │   └── audit.py             # Verifiable Cryptographic Audit Ledger
│   ├── tools/
│   │   ├── base.py              # BaseTool & ToolRegistry
│   │   ├── stac_discovery.py    # STAC Catalog Search (Sentinel-2 / SAR)
│   │   ├── spectral_indices.py  # NDVI, NDWI, NBR, NDBI, NDMI, SAVI, BSI
│   │   ├── cloud_masking.py     # SCL QA Cloud & Shadow Masking
│   │   ├── change_detection.py  # Bi-temporal CVA & Adaptive Thresholding
│   │   ├── sar_radar.py         # Sentinel-1 SAR Monsoon Flood Analytics
│   │   ├── zonal_stats.py       # Quantitative Area Calculus (km², ha)
│   │   └── synthetic_data.py    # Calibrated Multi-Spectral EO Simulation
│   ├── api/
│   │   ├── routes.py            # REST & SSE Streaming Endpoints
│   │   └── schemas.py           # Pydantic Schemas
│   └── web/                     # Modern Dark-Theme Geospatial UI
│       ├── index.html
│       ├── css/style.css
│       └── js/{app.js, map.js, charts.js}
├── tests/                       # Automated Pytest Suite
├── Dockerfile                   # Production Container
├── requirements.txt             # Dependencies
└── README.md
```

---

## ⚡ Quick Start

### 1. Installation

```bash
# Clone the repository
git clone https://github.com/ved3010/satquery.git
cd satquery

# Create and activate virtual environment
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

### 2. Launch the Web UI

```bash
python -m satquery.main --port 8000
```
Open **[http://localhost:8000](http://localhost:8000)** in your browser.

---

### 3. Run directly from CLI

```bash
# Example 1: Western Ghats Deforestation
python -m satquery.main --query "What changed in Western Ghats between 2020 and 2025?"

# Example 2: Osman Sagar Lake Water Depletion
python -m satquery.main --query "Calculate surface water loss in Osman Sagar lake between 2021 and 2024"

# Example 3: Assam Flood All-Weather SAR Radar
python -m satquery.main --query "Map flood inundation along Brahmaputra River using Sentinel-1 SAR"
```

---

## 🧪 Running Automated Tests

```bash
pytest -v
```

---

## 🐳 Docker Deployment

```bash
# Build docker image
docker build -t satquery-ai .

# Run container
docker run -p 8000:8000 satquery-ai
```

---

## 📜 API Documentation

Once the server is running, visit **[http://localhost:8000/docs](http://localhost:8000/docs)** for interactive Swagger documentation.

- `POST /api/query`: Execute full agentic remote sensing pipeline.
- `GET /api/stream`: Server-Sent Events (SSE) for live step-by-step DAG telemetry.
- `GET /api/examples`: Fetch pre-configured Pan-India and global test scenarios.
- `GET /api/tools`: Inspect registered remote sensing tool signatures.

---

## 📄 License

MIT License © 2026 Vedant & SatQuery AI Contributors.
