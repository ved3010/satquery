# SatQuery AI — Master Plan

**SIH 2026 · PS 26167 · ISRO/SAC**
*An Interactive Vision-Language Assistant for Multimodal Remote Sensing Image Analysis*

> This is the single source of truth for the final product. It supersedes the
> `satquery/`, `sonar/` and `vqa/` prototypes. Everything here is free, and every
> claim is either measured on this machine or cited.

---

## 0. Hardware reality check — read this first

I benchmarked your machine before designing anything, because it invalidates the
obvious plan.

| | |
|---|---|
| CPU | Intel i7-1165G7, **4 cores / 8 threads**, 2.8 GHz |
| GPU | **Intel Iris Xe (integrated)** — no CUDA, no NVIDIA |
| RAM | 15.8 GB |
| Disk | C: 97 GB free · D: 111 GB free |
| PyTorch | 2.12.0 **+cpu** · `torch.cuda.is_available() == False` |

**Three consequences that shape the whole project:**

1. **QLoRA cannot run on this laptop.** QLoRA needs `bitsandbytes` 4-bit kernels,
   which are CUDA-only. There is no CPU path. A 2B VLM fine-tune on these 4 cores
   would take weeks, not hours.
2. **BigEarthNet cannot be downloaded in full.** The image archive (549,488
   Sentinel-1 + Sentinel-2 patch pairs) is ~120 GB. You have 111 GB free on D:.
   Even if it fit, it would leave zero room to work.
3. **A 7B VLM is not servable here.** On these cores a 7B Q4 model runs at
   ~3–4 tok/s. A 2B Q4 runs at ~8–15 tok/s. **This is why every model below is
   sized at 2B or smaller.** It is a hard constraint, not a preference.

**The plan therefore splits cleanly in two:**

```
TRAIN on Kaggle  (free NVIDIA P100 16GB / 2×T4, 30 h per week)
   ↓ download small artefacts (adapters, ONNX, GGUF — all < 2 GB total)
SERVE on your laptop  (CPU, offline, demo-day-proof)
```

Kaggle's free tier gives **30 GPU-hours/week**, sessions up to 9–12 h, a P100
(16 GB) or dual T4 (32 GB), and ~70 GB of scratch disk that does not touch your
D: drive. That scratch disk is the reason BigEarthNet becomes tractable: we
download the subset *inside the Kaggle session*, train, and only bring home the
weights.

> ⚠️ **P100 and T4 do not support bfloat16.** bf16 needs Ampere (sm_80+); P100 is
> sm_60 and T4 is sm_75. Every training script must use **fp16**, not bf16, or it
> will crash on the first step. This trips up almost everyone copying tutorials
> written for A100s.

---

## 1. What the problem statement actually demands

Stripping the prose, PS 26167 has **five mandatory capabilities** plus one
architectural requirement. Miss any one and the submission is disqualified,
regardless of how good the rest is.

| # | Mandatory requirement | Satisfied by |
|---|---|---|
| M-1 | ≥1 component **fine-tuned on BigEarthNet.txt** or open RS data | Models 1, 3, 4, 6, 7 |
| M-2 | **Single-image VQA** | Model 2 |
| M-3 | **One more** single-image task (captioning *or* grounding) | Models 3 **and** 4 — we do both |
| M-4 | **Bi-temporal change** description or change-VQA | Model 5 |
| M-5 | **Optical–SAR pair** joint analysis | Model 6 |
| M-6 | **Agentic orchestration** with auditable execution trace | LangGraph controller (§5) |

The PS states plainly: *"A generic LLM or VLM without remote-sensing adaptation
will not satisfy the requirements."* Wrapping GPT-4o in a nice UI scores **zero**.
Domain adaptation is the gate.

It also demands something most teams will skim past and lose points on:

> *"provide an auditable execution summary containing the selected task,
> model/tool names, and key parameters"* … *"only the observable execution trace
> … will be evaluated."*

**Internal reasoning is explicitly not evaluated. The trace is.** We therefore
treat the execution trace as a first-class product surface, not a log file — see
§6, where it becomes our biggest differentiator.

---

## 2. The dataset situation — what to download and what to skip

### BigEarthNet.txt (the primary training set)

Published April 2026, arXiv:2603.29630. The crucial structural fact:

- **Text annotations: one 467 MB parquet file** — 9,553,962 rows. Downloadable
  on your laptop in minutes.
- **Images: separate**, from BigEarthNet v2.0 / reBEN — 549,488 co-registered
  S1+S2 patch pairs, ~120 GB. **Not** downloadable here.

Licence: **CDLA-Permissive-1.0** on the text, CC-BY on the imagery — both allow
competition use. Cite them in the deck.

It contains exactly three annotation types, and they map 1:1 onto three of our
mandatory tasks:

| Annotation type | Feeds |
|---|---|
| Geographically-anchored captions (LULC classes, spatial relations, context) | Model 3 (captioning) |
| Visual question answering pairs | Model 2, Model 7 |
| Referring-expression instructions with bounding boxes | Model 4 (grounding) |

Plus a **1,082-pair manually verified benchmark split** — use this for every
number you put on a slide, because it is human-checked.

**Strategy: text-first, images-on-demand.** Pull the parquet locally, decide
which ~60–80k patches we actually need, and fetch only those inside Kaggle. That
turns 120 GB into ~18 GB of scratch.

#### Verified schema

I streamed the real dataset rather than assuming its shape
(`python scripts/get_bigearthnet_txt.py --peek`). The actual columns:

| column | example | why it matters |
|---|---|---|
| `ID` | `2` | row id |
| `s1_name` | `S1B_IW_GRDH_1SDV_20170612T165809_33UUP_26_57` | **exact reBEN S1 patch to fetch** |
| `patch_id` | `S2A_MSIL2A_20170613T101031_N9999_R022_T33UUP_26_57` | **exact reBEN S2 patch to fetch** |
