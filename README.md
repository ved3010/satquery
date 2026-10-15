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
│  └── /console    map AOI → live Sentinel fetch → query → trace → .md     │
└───────────────────────────────┬─────────────────────────────────────────┘
                                │  HTTP (same-origin rewrite, or direct
                                │        via NEXT_PUBLIC_SATQUERY_API)
┌───────────────────────────────▼─────────────────────────────────────────┐
│  serve/          FastAPI                                                │
│  ├── api.py      /health /models /upload /aoi/fetch /query /runs        │
│  ├── aoi.py      keyless STAC search → Sentinel-2 L2A + Sentinel-1 GRD  │
│  └── analysis.py NDVI · MNDWI · NDBI → measured land cover              │
└───────────────────────────────┬─────────────────────────────────────────┘
                                │
┌───────────────────────────────▼─────────────────────────────────────────┐
│  agent/          the controller                                         │
│  ├── registry.py declarative ModelSpec table — the router's ONLY source │
│  ├── router.py   hybrid rule + LLM task routing, with refusal reasons   │
│  ├── graph.py    LangGraph state machine (the 7 nodes above)            │
│  ├── tools.py    runtime dispatch: torch · onnx · llama.cpp             │
│  ├── torch_runtime.py  per-model adapters for the CPU-trained specialists│
│  └── trace.py    execution trace → JSON + Markdown + Obsidian vault     │
└───────────────────────────────┬─────────────────────────────────────────┘
                                │
┌───────────────────────────────▼─────────────────────────────────────────┐
│  models/         one shared encoder, many heads                         │
│  ├── backbone.py 14-channel CNN encoder (12 S2 bands + S1 VV/VH)        │
│  │                └─ M1 CLIP · M3 caption · M4 ground · M5 change · M6  │
│  ├── vlm.py      M7 — frozen tower → 17 visual tokens → causal decoder  │
│  └── train_all.py / train_vlm.py    CPU training, every metric baselined│
└─────────────────────────────────────────────────────────────────────────┘
```

**Why a registry.** The router may only select models that exist in
`agent/registry.py`, and the trace records exactly which entry ran with which
parameters. Adding a model later is one `ModelSpec` — not a code change
anywhere else. That constraint is what makes the trace auditable in the sense
the problem statement requires.

**Why LangGraph.** It checkpoints every state transition. That checkpoint
stream *is* the auditable execution summary, so the deliverable falls out of
the architecture instead of being a separate log that drifts out of sync with
what actually ran.

---

## 4. IndiaSat — a 100% Indian corpus

**BigEarthNet contains zero Indian data.** Its labels come from CORINE Land
Cover, a Europe-only product, so its latitude and longitude ranges do not
overlap India at all. Swapping CORINE for **ESA WorldCover** (10 m, global,
CC-BY-4.0) reproduces the recipe over India.

| | |
|---|---|
| **985** | patches |
| **8,962** | annotations — captioning, binary, MCQ, referring boxes |
| **8** | regions: Ahmedabad · Guwahati · Jaisalmer · Kochi · Ludhiana · Pune · Shimla · Sundarbans |
| **100%** | India |

Tropical monsoon, arid desert, savannah, humid subtropical and montane —
**every Köppen zone absent from BigEarthNet**. Sentinel-2 (12 band) +
Sentinel-1 (VV/VH) + WorldCover labels, co-registered, all from keyless public
sources. Annotations use the BigEarthNet.txt schema, so the two corpora
concatenate into one training mix.

Splits come from a deterministic grid hash, so neighbouring — and therefore
overlapping — patches never straddle train and test.

---

## 5. The models

Eight specialists behind one backbone. **Every number below is measured on a
held-out test split and reported next to a baseline**, because an accuracy with
no baseline cannot answer the only question that matters: *is the model using
the image at all?*

| | model | task | metric | result | baseline |
|---|---|---|---|---:|---:|
| **M6** | `fusion` | Optical–SAR land cover | mAP | **0.9150** | 0.3424 class prior |
| **M7** | `vlm` | Instruction-following VLM | MCQ exact match | **0.9074** | 0.5079 image zeroed |
| **M3** | `caption` | Scene description | next-token acc | **0.9010** | 0.0743 modal token |
| **M5b** | `change_vqa` | Bi-temporal change VQA | accuracy | **0.7947** | 0.4702 majority |
| **M2** | `vqa` | Single-image VQA | overall acc | **0.7587** | 0.5749 majority |
| **M5a** | `change_map` | Change mask | IoU | **0.4420** | — |
| **M4** | `ground` | Referring-expression grounding | mean IoU | **0.3082** | 0.1983 mean box |
| **M1** | `rsclip` | Image–text retrieval | R@1 (n=151) | **0.1391** | 0.0066 chance |

M2 is measured on the RSVQA-LR held-out test split (10,004 QA pairs, 100 unseen
tiles). Every other row is measured on the IndiaSat test split.

### M7 in full

Frozen M1 vision tower → 17 visual prefix tokens → 4-layer causal decoder.
**2.34 M trainable of 3.52 M.** Trained in 47 minutes on four CPU cores.

| task | result | image zeroed | majority |
|---|---:|---:|---:|
| MCQ exact match | **0.9074** | 0.5079 | 0.2695 |
| Binary exact match | **0.9412** | 0.8387 | 0.6016 |
| Caption next-token | **0.9255** | 0.8464 | — |
| Referring boxes | 0.0000 | 0.0000 | 0.0075 |

The blind ablation is the same weights with the visual tokens zeroed. The
language prior in this corpus is strong, so blind is already high — **the gap
is the part of the answer that comes from the image**, and on multiple choice
it is 40 points.

The 0.0000 on referring boxes is real: M7 emits four coordinates as words and
an exact string match on those is close to unwinnable. Grounding is M4's job,
scored properly at 0.3082 mean IoU. The box questions stay in M7's training mix
because they teach spatial language, not because M7 is the grounding model.

### Why fusion exists — the cloud ablation

Simulate 50% cloud cover and only the fused model survives:

| M6 · mAP | clear | 50% cloud |
|---|---:|---:|
| Optical + SAR | 0.915 | **0.847** |
| Optical only | 0.731 | 0.651 |
| SAR only | 0.687 | 0.687 |

SAR is unaffected — it sees through cloud, day or night — and the fused model
degrades gracefully instead of failing. During a monsoon flood that difference
is the difference between an assessment and a wait.

---

## 6. Measured, not generated

**Every percentage in a report is computed from the pixels.** `serve/analysis.py`
reads Sentinel-2 L2A surface reflectance and applies published spectral indices:

| index | formula | reads | rule |
|---|---|---|---|
| **NDVI** | (NIR − RED) / (NIR + RED) | vegetation vigour | ≥ 0.30 dense · 0.18–0.30 sparse |
| **MNDWI** | (GREEN − SWIR) / (GREEN + SWIR) | open water | > 0.00 — Xu 2006 |
| **NDBI** | (SWIR − NIR) / (SWIR + NIR) | built-up | NDBI − NDVI > 0 — Zha 2003 |
| **ΔIndex** | index(t₂) − index(t₁) | change between dates | \|Δ\| > 0.10 |

Class assignment is a **decision cascade**, not four independent masks, so the
percentages sum to 100 and no pixel is ever counted as both water and built-up.
The thresholds are stated in every report, so a reader can disagree with a
number by disagreeing with a threshold rather than by trusting the system.

Bi-temporal runs report change **both** ways — 2% → 3% built-up is +1.0 pp *and*
+50% relative. Quoting only one of them is how a true number misleads.

### M7 is never allowed to supply a figure

A 2.34 M-parameter decoder trained on one corpus is good enough to describe a
scene and bad enough that a percentage it invented would be indistinguishable
from one that was measured.

IndiaSat captions are written as `"<class> covers approximately N% of the
scene"`, so M7 learned to emit percentages — from a 120×120 patch, not from the
AOI the user asked about. `_strip_figures()` in `agent/torch_runtime.py` removes
every generated number before the sentence reaches the answer, and where the
generated description disagrees with the measured dominant class, the report
says so:

> ⚠ **Disagreement:** M7 describes the scene as predominantly built up, while
> the measured indices make vegetation the largest class. The measured value is
> the one to act on.

If the bands an index needs are missing — a plain RGB upload has no NIR or SWIR
— the report says **"not computable"** rather than producing a number.

### A real report

```markdown
## Measured land cover

Computed from the pixels, not from a model. Sentinel-2 L2A surface reflectance;
NDVI / MNDWI (Xu 2006) / NDBI (Zha 2003). Ground sample distance 10 m.

**2023-02-10 → 2024-03-15** · 18.075 km² compared.

| class             | 2023-02-10 | 2024-03-15 |   Δ pp | Δ relative |  km² |
| ----------------- | ---------: | ---------: | -----: | ---------: | ---: |
| water             |      4.11% |      7.32% |  +3.21 |     +78.2% | 1.323 |
| vegetation        |     23.97% |     17.58% |  −6.38 |     −26.6% | 3.178 |
| sparse vegetation |     17.52% |     17.40% |  −0.12 |      −0.7% | 3.144 |
| built-up          |     23.38% |     19.34% |  −4.05 |     −17.3% | 3.495 |
| bare/other        |     31.03% |     38.37% |  +7.34 |     +23.7% | 6.935 |

**Urbanisation.** 1.153 km² became built-up that was not before (6.38% of the
scene), converted from bare/other 76.4%, sparse vegetation 19.6%, vegetation 2.7%.
```

Every run writes this to `vault/runs/<run_id>.md`, downloadable at
`GET /runs/<run_id>/report.md`.

---

## 7. Running it

### Requirements

Python 3.12, Node 20+. **No GPU required** — everything trains and serves on CPU.

```bash
git clone https://github.com/sherlock2830/Satquery-unoff
cd Satquery-unoff

pip install -r requirements.txt
# CPU-only torch, if pip tries to pull a CUDA wheel:
#   pip install torch --index-url https://download.pytorch.org/whl/cpu
```

### Build the corpus and train

```bash
python scripts/fetch_worldcover.py       # 7 label tiles, ~940 MB
python scripts/build_india_dataset.py    # IndiaSat from S2 + S1 + WorldCover
python -m models.train_all               # M1 M3 M4 M5 M6  — reports in models/reports/
python -m models.train_vlm               # M7              — ~47 min on 4 cores
python scripts/export_norm.py            # normalisation stats next to the weights
python scripts/export_site_data.py       # push measured metrics into web/
```

### Serve

```bash
uvicorn serve.api:app --reload --port 8000     # the agent + models
npm --prefix web install
npm --prefix web run dev                       # the site, on :3001
```

Open **http://localhost:3001** for the site and **/console** for the working
console. Draw an area of interest, fetch live Sentinel imagery, ask a question.

### Verify without the UI

```bash
python -m agent.registry     # registry table + mandatory-coverage check
python -m agent.router       # routing over the PS representative queries
python -m agent.graph        # all four task families, end to end, on real imagery
python -m agent.trace        # regenerate the vault model and AOI notes
```

---

## 8. Repository layout

```
satquery-core/
│
├── agent/                       the controller
│   ├── registry.py              declarative ModelSpec table — the router's only source
│   ├── router.py                task classification + refusal reasons
│   ├── graph.py                 LangGraph state machine, 7 nodes
│   ├── tools.py                 runtime dispatch (torch · onnx · llama.cpp)
│   ├── torch_runtime.py         per-model adapters + M7 answer composition
│   └── trace.py                 execution trace → JSON · Markdown · vault notes
│
├── models/                      one shared encoder, many heads
│   ├── backbone.py              14-channel CNN encoder + 5 task heads
│   ├── vlm.py                   M7 — frozen tower → visual prefix → decoder
│   ├── train_all.py             trains M1 M3 M4 M5 M6, every metric baselined
│   ├── train_vlm.py             trains M7 on the IndiaSat instruction mix
│   ├── reports/                 measured metrics, written by the trainers
│   └── weights/                 artefacts (gitignored) + vocabs and norm stats
│
├── serve/                       the service
│   ├── api.py                   FastAPI
│   ├── aoi.py                   keyless STAC → live Sentinel-1 / Sentinel-2
│   ├── analysis.py              NDVI · MNDWI · NDBI → measured land cover
│   └── static/index.html        minimal zero-build test console
│
├── web/                         the site
│   ├── app/page.tsx             landing — problem · solution · models · business
│   ├── app/console/page.tsx     the working console
│   ├── components/              Chrome · Hero · Sections · Models · Business
│   ├── components/console/      AoiMap (Leaflet) · Results
│   └── lib/                     api client · content · market · models.json
│
├── data/
│   ├── india.py                 the 8 regions and their Köppen zones
│   ├── annotate.py              annotation generation in the BigEarthNet schema
│   └── indiasat/                the corpus (gitignored)
│
├── scripts/                     dataset fetchers, exporters, smoke tests
├── notebooks/                   Kaggle path for the full ViT-B/32 M1
├── docs/
│   ├── MASTER_PLAN.md           architecture, training recipes, hosting decision
│   ├── RESULTS.md               measured metrics, ablations, honest caveats
│   └── OBSIDIAN_GUIDE.md        vault setup, graph view, Dataview queries
└── vault/                       Obsidian vault — run · model · AOI notes
```

---

## 9. API reference

| method | path | purpose |
|---|---|---|
| `GET` | `/` | the zero-build test console |
| `GET` | `/health` | service status, registered and trained models, mandatory coverage |
| `GET` | `/models` | full registry with measured metrics |
| `POST` | `/upload` | store one image, returns a path usable in `/query` |
| `POST` | `/aoi/fetch` | live Sentinel fetch for a drawn bbox → image refs + scene provenance |
| `GET` | `/preview?path=` | 8-bit PNG preview of a fetched or uploaded scene |
| `POST` | `/query` | run one query end to end → answer, analysis, trace, markdown |
| `GET` | `/runs` | recent runs from the vault |
| `GET` | `/runs/{run_id}/report.md` | download one run's Markdown report |

```bash
curl -X POST localhost:8000/query -H 'Content-Type: application/json' -d '{
  "query": "What changed between these two dates?",
  "images": [
    {"path": "…/t1.tif", "modality": "optical", "date": "2023-02-10"},
    {"path": "…/t2.tif", "modality": "optical", "date": "2024-03-15"}
  ]
}'
```

---

## 10. Design decisions worth knowing

**Training runs on CPU, here.** This laptop has no NVIDIA GPU, so QLoRA on a 2B
VLM is impossible locally — `bitsandbytes` is CUDA-only. Rather than ship a
stub, M7 is the same architecture idea at a size that fits: a frozen vision
tower whose features are cached once, and a small decoder that is the only thing
learning. Swapping the frozen tower for the Kaggle ViT-B/32 is a constructor
change, not a redesign.

**A stub must never be mistakable for a real inference.** Every stubbed result
carries `stub=True`, the graph stamps `STUB` into the trace, and the answer text
says so. A development screenshot cannot masquerade as a measured result.

**Inference reuses the training normalisation.** `models/weights/indiasat_norm.npz`
is tracked in git. Recomputing statistics from whatever image a user uploads
would shift the input distribution and quietly degrade every prediction — a
failure with no error message, which is the worst kind.

**Serving would use llama.cpp, not Ollama,** for the 2B variant. Ollama cannot
load a separate `mmproj` vision projector for a custom fine-tuned VLM
([ollama#14730](https://github.com/ollama/ollama/issues/14730),
[ollama#9967](https://github.com/ollama/ollama/issues/9967)) — and it fails by
silently dropping vision, the worst possible failure mode.

**The vault is a folder of Markdown.** Obsidian only ever *reads* it; it is
never in the request path. Open `vault/` as a vault and the graph view renders
the live provenance network — every query, every model, every AOI. Everything
works without it installed.

**Confidence is the weakest link, not the average.** A chain is only as good as
its least confident step.

---

