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
