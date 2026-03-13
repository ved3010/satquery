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

    subgraph AgentGraph ["7-Step LangGraph State Machine"]
        API --> Ingest[01. INGEST - GeoTIFF / BBox / CRS]
        Ingest --> Validate[02. VALIDATE - Modality & Task Fit]
        Validate --> Route[03. ROUTE - Rule-Table / Intent Classifier]
        Route --> Execute[04. EXECUTE - Specialist Model Dispatch]
        Execute --> Measure[05. MEASURE - NDVI / NDBI / MNDWI Indices]
        Measure --> Synth[06. SYNTHESIS - M7 VLM / Answer Composition]
        Synth --> Evidence[07. EVIDENCE - Spatial Mask & Trace Audit]
    end

