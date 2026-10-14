<div align="center">

# SatQuery AI

**Ask Earth a question. Get an auditable answer.**

An agentic vision–language assistant for multimodal remote sensing — optical,
SAR and bi-temporal satellite imagery, interrogated in plain language and
answered with measured evidence and a full execution trace.

**Smart India Hackathon 2026 · Problem Statement 26167 · ISRO / Space Applications Centre**

Built by **Team TMS&lt;3**

[![models](https://img.shields.io/badge/models-8%2F8_trained-34d399?style=flat-square)](#5-the-models)
[![runs on](https://img.shields.io/badge/runs_on-CPU-2f7bf0?style=flat-square)](#7-running-it)
[![imagery](https://img.shields.io/badge/imagery-Copernicus_Sentinel--1_%26_2-2f7bf0?style=flat-square)](#4-indiasat)
[![licence](https://img.shields.io/badge/licence-MIT-lightgrey?style=flat-square)](LICENSE)
[![status](https://img.shields.io/badge/status-production_ready-34d399?style=flat-square)](#)

</div>

---

## Contents

1. [The problem](#1-the-problem)
2. [The solution](#2-the-solution)
3. [Architecture](#3-architecture)
4. [IndiaSat — a 100% Indian corpus](#4-indiasat--a-100-indian-corpus)
5. [The models](#5-the-models)
6. [Measured, not generated](#6-measured-not-generated)
7. [Running it](#7-running-it)
8. [Repository layout](#8-repository-layout)
9. [API reference](#9-api-reference)
10. [Design decisions worth knowing](#10-design-decisions-worth-knowing)
11. [Deployment](#11-deployment)
12. [Team](#12-team)

---

## 1. The problem

> **PS 26167 — Agentic vision-language assistant for multimodal remote-sensing image analysis.**
> Build a system that accepts satellite imagery and a natural-language question,
> classifies the task, validates the inputs, selects and sequences specialist
> models, and returns an answer together with **an auditable execution summary
> containing the selected task, model/tool names, and key parameters**.

Sentinel-1 and Sentinel-2 imagery is free, global and updated every few days.
Turning one scene into one answer is still a specialist's day of work.

| | |
|---|---|
| **One model per task, per sensor** | Land-cover classification, object detection, VQA and change detection ship as separate single-task systems, each with its own inputs, formats and operators. Nothing composes. |
| **The pre-processing *is* the job** | Twelve bands, an unknown projection, a ground sample distance to reconcile, speckle to filter, two dates to co-register. The analysis is the short part. |
| **Answers arrive without evidence** | A raster comes back. Which model produced it, at what threshold, with what confidence — none of that survives to the person making the decision. |
| **So the people who need it cannot use it** | A district officer, a forest ranger, a relief coordinator during a monsoon flood. They have the question and the mandate. They do not have the GIS toolchain or the week. |

### Mandatory functional scope, and where it is covered

| Requirement | Covered by | Status |
|---|---|---|
| **M-2** Single-image VQA | `M2` vqa, `M7` vlm | ✅ |
| **M-3** Captioning **or** grounding | `M3` caption, `M4` ground, `M7` vlm | ✅ both |
| **M-4** Change analysis (bi-temporal) | `M5a` change_map, `M5b` change_vqa | ✅ |
| **M-5** Optical–SAR joint extraction | `M6` fusion | ✅ |
| Input upload and compatibility checking | `agent/graph.py` VALIDATE → REJECT | ✅ |
| Auditable execution summary | `agent/trace.py` → JSON · Markdown · Obsidian vault | ✅ |

`python -m agent.registry` prints this table and **raises** if any mandatory
requirement has no model. Coverage is a structural property of the registry,
not a claim in a document.

---

## 2. The solution

One question in. One agent. Seven observable steps.

```
                      ┌──────────────────────────────────────────┐
   query + imagery ──▶│ 01 INGEST     modality · bands · CRS ·    │
                      │               GSD · acquisition dates    │
                      └────────────────────┬─────────────────────┘
                                           ▼
                      ┌──────────────────────────────────────────┐
                      │ 02 VALIDATE   can these inputs answer    │──▶ REJECT
                      │               this question at all?      │    (with a
                      └────────────────────┬─────────────────────┘     reason)
                                           ▼
                      ┌──────────────────────────────────────────┐
                      │ 03 ROUTE      task family → specialists   │
                      │               from the declared registry │
                      └────────────────────┬─────────────────────┘
                                           ▼
                      ┌──────────────────────────────────────────┐
                      │ 04 EXECUTE    run the selected models     │
                      │               text · mask · box · stats  │
                      └────────────────────┬─────────────────────┘
                                           ▼
                      ┌──────────────────────────────────────────┐
                      │ 05 MEASURE    NDVI · MNDWI · NDBI over    │
                      │               the real reflectance values│
                      └────────────────────┬─────────────────────┘
                                           ▼
                      ┌──────────────────────────────────────────┐
                      │ 06 SYNTHESISE M7 narrates the findings.   │
                      │               It never supplies a number.│
                      └────────────────────┬─────────────────────┘
                                           ▼
                      ┌──────────────────────────────────────────┐
                      │ 07 EXPLAIN    answer + measured table +   │
                      │               execution trace → report.md│
                      └──────────────────────────────────────────┘
```

### Five task families

| | Family | What it answers |
|---|---|---|
| 01 | **Single-image understanding** | What does this scene contain? What dominates its land cover? — VQA and captioning over one optical or SAR observation. |
| 02 | **Cross-modal analysis** | Optical carries spectral context; SAR carries structure and sees through cloud, day or night. Together they resolve built-up and water regions either alone leaves ambiguous. |
| 03 | **Multitemporal change** | What changed between two co-registered dates, where, and by how much — with a change mask as spatial evidence. |
| 04 | **Text-guided grounding** | "The water body north of the settlement" resolves to a box on the scene, so the answer points at something. |
| 05 | **Agentic orchestration** | The question decides the pipeline, not the developer. A LangGraph state machine classifies, validates, selects, sequences and integrates — checkpointing every transition. |

### Refusal is a feature

```
Q: What changed between these two dates?          (one image supplied)
   config=single-optical  task=change_vqa  models=[]  11ms
   REJECTED: Change analysis needs two images acquired at different times;
             one was supplied.
```

The refusal is written to the vault as a run note like any other. PS 26167 asks
for input compatibility checking — correctly refusing an impossible request
demonstrates it; silently returning garbage does not.

---

## 2.1 The Tactical 3D Console & Dual Surveillance Cockpit

SatQuery AI pairs spaceborne earth observation with street-level municipal ground intelligence in an interactive interface:

```
┌────────────────────────────────────────────────────────────────────────┐
│  ORBIT: Sentinel-2 Multispectral 10m GSD (Top of Atmosphere / L2A)     │
│  [==============================================================]      │
│  70.09 km² AOI · Multispectral Reflectance · Calculated Indices        │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ Spatial-Temporal Synchronization
┌───────────────────────────────────▼────────────────────────────────────┐
│  GROUND: Real-Time Municipal Smart-City CCTV Feeds (1080p FHD @ 30fps) │
│  Pune Swargate · Mumbai BKC · Bengaluru Silk Board · Delhi CP · Hyd    │
└────────────────────────────────────────────────────────────────────────┘
```

| Feature | Description | Technical Implementation |
|---|---|---|
| **Full-Viewport 3D Globe** | Interactive 3D Earth canvas with dynamic pitch, bearing, and orbital satellite tracking. | MapLibre GL 3D globe with custom atmosphere, starfield shader, and sensor layer toggles (Optical, SAR, CIR, NDVI). |
| **Gemini AI Chat Studio** | Floating translucent glassmorphic terminal anchored above Earth. Accepts natural language queries, image attachments, and preset scenes. | React 19 + Tailwind CSS glassmorphism (`backdrop-blur-xl`), automatic STAC scene attachment, and live streaming traces. |
| **Dual Orbit-to-Ground Cockpit** | Side-by-side synchronized view comparing spaceborne Sentinel-2 passes with live street-level traffic/transit feeds. | `DualSurveillanceCockpit.tsx` + `puneCctvFeeds.ts` with camera switching, detection counts (vehicles, buses, pedestrians), and incident reports. |
| **Point Inspector HUD** | Click any coordinate on Earth to inspect localized spectral reflectance and instant AI confidence. | `PointInspectorHud.tsx` displaying real-time NDVI, NDBI, MNDWI gauges, transition category, and direct agent query trigger. |
| **Client-Side GIS Export** | Export detected features and spectral anomalies directly into GIS-ready formats for QGIS and ArcGIS. | `exportUtils.ts` exporting standard GeoJSON FeatureCollections and tabular CSV files. |

---

## 3. Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│  web/            Next.js 15 · Tailwind 4 · React 19                      │
│  ├── /           landing — problem, solution, models, business plan      │
