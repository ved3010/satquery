# SatQuery AI — System Architecture Specification

## Overview

SatQuery AI is an agentic vision-language assistant for multimodal remote sensing and earth observation. It couples spaceborne satellite observations (Sentinel-2 multispectral and Sentinel-1 SAR) with street-level ground surveillance feeds and an auditable execution trace.

```mermaid
flowchart TD
    User([User Natural Language Query]) --> WebUI[Next.js Tactical Console / 3D Globe]
    WebUI --> API[FastAPI Orchestrator :8000]
    
    subgraph STAC ["Data Acquisition Pipeline"]
        API --> AOI[serve/aoi.py - STAC Discovery]
        AOI --> S2[Sentinel-2 L2A Multispectral]
        AOI --> S1[Sentinel-1 GRD SAR]
    end

