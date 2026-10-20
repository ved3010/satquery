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
| `input` | `"Would you confirm that any broad-leaved forest borders upon pastures?"` | instruction / question |
| `output` | `"no"` | target |
| `type` | `binary` | answer format |
| `category` | `adjacency`, `area` | question class — use to stratify |
| `split` | `test` | **train/val/test/bench already assigned** |
| `latitude`, `longitude` | `48.110`, `12.740` | AOI notes, geographic held-out splits |
| `country`, `season`, `climate_zone` | `Austria`, `Summer`, `Cold, no dry season, warm summer` | domain-shift analysis |

#### Measured contents (full parquet, 446 MB, downloaded and analysed)

**9,553,962 rows over 464,044 unique patches — 20.4 annotations per patch.**

| split | rows | unique patches |
|---|---:|---:|
| train | 4,674,281 (48.9%) | 229,114 |
| validation | 2,454,690 (25.7%) | — |
| test | 2,409,962 (25.2%) | — |
| **bench** (human-verified) | **15,029** (0.2%) | **1,082** |

| annotation type | rows | share | feeds | in bench |
|---|---:|---:|---|---:|
| binary (yes/no) | 3,625,160 | 37.9% | M2, M7 | 6,927 |
| mcq | 3,259,184 | 34.1% | M2, M7 | 5,550 |
| **bounding box** | **2,205,686** | **23.1%** | **M4 grounding** | 1,582 |
| captioning | 463,932 | 4.9% | M1, M3 | 970 |

Categories: `presence` / `area` / `count` ≈1.39 M each, `adjacency` 1.22 M,
`point` 1.14 M, `reference` 1.06 M, `season` / `climate zone` / `country`
≈464 k each, `relative pos` 99 k.

**The 20.4-annotations-per-patch ratio is the most useful number here.** It
collapses the download problem:

| goal | samples | patches needed | est. imagery |
|---|---:|---:|---:|
| M7 QLoRA instruction mix | 150 k | **~7,400** | ~2 GB |
| M4 grounding | 300 k | ~15,000 | ~4 GB |
| M1 RS-CLIP contrastive | 80 k pairs | 80,000 † | ~21 GB |

† Captioning is **one caption per patch** (463,932 captions / 464,044 patches),
so contrastive training is the one job whose patch count equals its sample count.
It dominates the download budget; everything else is nearly free. *(GB figures
are estimates from the reBEN archive size ÷ patch count — verify in-session
before relying on them.)*

#### ⚠️ Domain shift: BigEarthNet.txt is entirely European

This is the biggest scientific risk in the project and it needs stating plainly.

Finland 31.6% · Portugal 19.1% · Serbia 15.5% · Lithuania 11.2% · Austria 9.5% ·
Ireland 8.5% · Belgium 2.5% · Switzerland 1.1% · Luxembourg 0.8% · Kosovo 0.3%

Ten countries. Every Köppen zone present is **Cold** or **Temperate**. There is
**no tropical, arid, or monsoon zone anywhere in the dataset.**

ISRO will evaluate on **Cartosat-2S + RISAT pairs over Indian scenes** — tropical,
monsoonal, arid, and at a different ground sample distance from Sentinel. A model
adapted purely on this corpus is being asked to generalise across a genuine
distribution gap.

This is not a reason to avoid BigEarthNet.txt — the PS mandates it, and it is the
right primary corpus. But it changes three decisions:

1. **Hold out Portugal, not a random split.** Portugal is the only
   `Temperate, dry summer, hot summer` (Köppen Csa) region in the corpus and the
   closest available analogue to Indian conditions. Training on the other nine
   countries and reporting on Portugal measures the domain shift that actually
   matters. A random split measures nothing and quietly overstates the result.
2. **Never hardcode Sentinel band statistics.** Already flagged for M6; this makes
   it non-negotiable for M1 too. Normalise per-sensor from metadata.
3. **Say this out loud in the deck.** An ISRO judge will think of it within
   thirty seconds. Naming the gap, quantifying it with the Portugal split, and
   showing the mitigation is far stronger than being caught by the question.

If time allows, supplementing with any tropical/Indian-subcontinent RS corpus
would measurably de-risk the final evaluation. Worth doing with the spare week.

---

### IndiaSat — building the Indian corpus ourselves

**There is no India subset of BigEarthNet to filter out.** Measured:

```
countries ..................... 10, all European
rows where country == "India" .. 0
rows inside India's bbox ....... 0
latitude range ................. 36.96 .. 67.98   (India:  6 .. 36)
longitude range ................ -8.99 .. 31.59   (India: 68 .. 98)
```

The coordinate ranges do not even overlap.

**Root cause, and the fix.** BigEarthNet's labels come from **CORINE Land Cover**,
which is a Europe-only product. That is *why* the archive is European. Swap CORINE
for **ESA WorldCover** — 10 m, global, 11 classes, CC-BY-4.0 — and the identical
recipe produces an Indian equivalent.

| layer | source | licence | key needed |
|---|---|---|---|
| Sentinel-2 L2A (12 band, optical) | Earth Search STAC → `sentinel-cogs` S3 | open | **no** |
| Sentinel-1 GRD (VV/VH, SAR) | Earth Search STAC | open | **no** |
| Land-cover labels (11 class) | ESA WorldCover v200 2021, public S3 | CC-BY-4.0 | **no** |

All three are keyless — **no Copernicus or AWS account is required**, which
removes a registration blocker from the critical path. (Copernicus stays the plan
for *live* demo queries in §7; it is the better georeferenced source there.)

PS 26167 permits this explicitly: *"adapted using BigEarthNet.txt **or the any
open source training data**."*

**Sampling design — eight regions spanning what BigEarthNet lacks:**

| region | state | Köppen zone | why |
|---|---|---|---|
| Kochi | Kerala | Tropical, monsoon | coastal backwater, palm plantation |
| Sundarbans | West Bengal | Tropical, savannah | tidal mangrove delta |
| Jaisalmer | Rajasthan | Arid, desert, hot | true desert, bare surface |
| Guwahati | Assam | Humid subtropical | Brahmaputra monsoon floodplain |
| Ludhiana | Punjab | Arid, steppe, hot | intensive irrigated cropland |
| Ahmedabad | Gujarat | Arid, steppe, hot | semi-arid urban growth |
| Pune | Maharashtra | Tropical, savannah | Deccan plateau mixed |
| Shimla | Himachal Pradesh | Temperate, dry winter | montane forest, snow |

**Every Köppen zone in that table is absent from BigEarthNet.txt.** That is the
entire point — it is the domain gap made trainable.

Annotations are generated to the *same schema* as the BigEarthNet.txt parquet
(`input`/`output`/`type`/`category`/`split` + geo columns), so the two corpora
concatenate into one training mix: pretrain on 9.55 M European annotations for
scale, fine-tune on IndiaSat for domain. Both PS requirements satisfied at once.

Everything is derived from the label raster — no model in the loop, nothing
hallucinated. Annotations are exactly as correct as WorldCover is.

**Two bugs caught by testing the generator on real Kochi labels**, both of which
would have silently poisoned training:

1. *"Is grassland present? → no"* on a patch that was **2.5% grassland**. The
   generator treated "below the 5% multilabel floor" as "absent". Absent now means
   **zero pixels**.
2. Bounding boxes covering **~99% of the frame**. Fragmented land cover makes the
   largest connected component sprawl edge to edge; such a box teaches grounding
   nothing and inflates IoU for free. Boxes over 85% of the frame are dropped.
   Mean box area fell from ~0.99 to 0.28.

**A third bug, in the fetcher.** STAC `bbox` search returns every scene whose
footprint *overlaps* the box, but a Sentinel-2 tile is a 110 km square and the AOI
can fall outside it entirely — producing `WindowError: Intersection is empty`
with `col_off=13684` against a raster width of 10980. Fixed by intersecting an
explicit **Point** and then verifying the window is in bounds before committing,
since even a Point hit can land in an orbit-swath nodata region.

#### Four further consequences worth acting on:

1. **`s1_name` + `patch_id` are the download manifest.** Select rows first, then
   fetch exactly those patches. This is what makes the 120 GB archive tractable.
2. **`split` ships inside the parquet** — no separate split files, and no risk of
   inventing our own splits and being accused of leakage.
3. **`input`/`output` is already instruction-tuning format.** M7's training mix is
   a filter and a reformat, not an annotation effort.
4. **`country` / `climate_zone` enable a geographic held-out split** — the
   Portugal hold-out described above. Note this is a *within-Europe* shift, not
   an India-like one: measuring it is far better than a random split and almost
   no team will do it, but it is a lower bound on the real evaluation gap, not
   an estimate of it. Report it as such.

### Everything else

| Dataset | Size | Purpose | Where |
|---|---|---|---|
| **RSVQA-LR** | ~100 MB | Single-image VQA train + eval | ✅ already downloaded in `vqa/data/` |
| **RSVQA-HR** | ~15 GB | VQA generalisation | Kaggle only |
| **VRSBench** | ~12 GB | Eval: captioning, VQA, grounding | Kaggle only |
| **CDVQA** | ~2 GB | Change VQA — 2,968 pairs from SECOND, ~122k QA, 19 answer classes | Local OK |
| **LEVIR-CD** | ~2 GB | Change *masks* — 637 pairs @ 1024², 20 Texas regions | Local OK |
| **BEN-v2 subset** | ~18 GB | Optical–SAR fusion, RS-CLIP | Kaggle only |

Local footprint stays **under 10 GB**. Nothing threatens your 111 GB.

---

## 3. The seven models

Each entry: what it is, why it exists, how it trains, and what number we expect.
Models are numbered M1–M7 and referenced by those tags everywhere in the code.

---

### M1 — `rsclip` · Remote-Sensing CLIP (the domain-adaptation core)

**This is the model that satisfies M-1 and unblocks four others.** It is the most
important model in the project and should be trained first.

A dual-encoder trained contrastively on BigEarthNet.txt image–caption pairs, so
that satellite imagery and remote-sensing English land in one shared embedding
space. Generic CLIP has never seen a VV/VH backscatter composite or a
Sentinel-2 red-edge band; this fixes that.

- **Init:** OpenCLIP ViT-B/32.
- **The key surgery:** CLIP's patch-embed conv takes 3 channels. We inflate it to
  **14** — 12 Sentinel-2 bands + 2 Sentinel-1 (VV, VH) — by replicating the RGB
  kernels across the new bands and rescaling by `3/14` so activation magnitude is
  preserved. Random init here destroys the pretrained features; this does not.
- **Train:** InfoNCE, fp16, batch 256 (grad-accum on P100), AdamW lr 1e-5 on the
  towers / 1e-4 on the new conv, ~10 epochs over an 80k-pair subset.
- **Cost:** ~4 h on P100. **~4 of your 30 weekly hours.**
- **Eval:** image↔text Recall@1/5/10 on the 1,082 verified pairs; zero-shot mAP
  on the BEN-19 label set.
- **Reuse:** its frozen image tower is the backbone of **M2, M3, M4 and M6**.
  Train once, use four times — this is what makes the whole schedule fit.

---

### M2 — `vqa` · Single-image VQA *(mandatory M-2)*

You already have a working, honestly-evaluated model here: **75.87% OA / 77.18%
AA** on the held-out RSVQA-LR test split. Do not throw it away — it is a genuine
asset and, importantly, its `RESULTS.md` already documents its own weakness,
which is exactly the kind of thing that wins credibility with judges.

Your own ablation found the real defect:

> *`comp` **−0.8 pts** vs the blind model, i.e. the image does not help at all.
> Mean-pooling the word embeddings discards word order, so "more roads than
> forests?" and "more forests than roads?" are the same vector.*

That diagnosis is correct, and it dictates the upgrade precisely:

| | v1 (yours, done) | v2 (planned) |
|---|---|---|
| Image encoder | ImageNet MobileNetV2, frozen | **M1 RS-CLIP tower**, last block unfrozen |
| Question encoder | 64-d bag-of-words, mean-pooled | **BiGRU** (order-aware) → fixes `comp` |
| Fusion | concat → MLP | concat + gated attention over patches |
| Training | CPU, 6.5 min | P100, ~40 min |
| Overall accuracy | 75.87% | **target 80–83%** |

The published RSVQA-LR baseline is ~79% OA, so 80%+ is a beat-the-paper claim we
can actually defend. `comp` should move from 69.5% to the high 70s purely from
the BiGRU; that single change is the headline.

Keep v1 as a checked-in ablation. "Here is what we tried, here is why it failed,
here is the fix" is worth more than a number without a story.

---

### M3 — `caption` · Scene captioning *(satisfies M-3)*

Prefix-tuned captioner: M1's frozen image embedding is projected into *k=10*
soft prompt tokens and prepended to a small causal LM decoder, which is trained
with cross-entropy on BigEarthNet.txt captions. Only the projector and decoder
train — ~25M parameters.

- **Cost:** ~2 h on P100.
- **Eval:** VRSBench captioning — BLEU-4, METEOR, ROUGE-L, CIDEr.
- **Why separate from M7:** it runs in ~50 ms on CPU vs ~4 s for the VLM. The
  agent calls M3 for the fast structured pass and M7 only when the user wants
  discussion. It is also a working fallback if the VLM fails on demo day.

---

### M4 — `ground` · Text-guided region grounding *(also M-3)*

Answers *"Highlight the water body referred to in the query"* with an actual box
on an actual image. BigEarthNet.txt's referring-expression annotations are built
for exactly this.

- **Architecture:** M1 image tower (patch grid retained, not pooled) + M1 text
  tower → 2-layer cross-attention → box head predicting `(cx, cy, w, h)`
  normalised.
- **Loss:** L1 + generalised IoU.
- **Cost:** ~3 h on P100.
- **Eval:** Acc@0.5 IoU on VRSBench referring expressions.

Doing **both** M3 and M4 when the PS only requires one is deliberate: it is cheap
(both reuse M1) and it visibly exceeds scope.

---

### M5 — `change` · Bi-temporal change detection + change-VQA *(mandatory M-4)*

Two heads over one shared siamese encoder — the highest-risk, highest-value model.

**M5a — change map.** Siamese M1 encoder → feature differencing → light U-Net
decoder → per-pixel binary mask. Trained on LEVIR-CD (637 VHR pairs). Metric: F1
and IoU. This produces the *visual evidence* the PS asks for.

**M5b — change VQA.** Same siamese trunk, plus a question encoder, → classifier
over CDVQA's 19 answer categories. Trained on CDVQA (2,968 SECOND pairs, ~122k
QA). Answers *"Has the built-up area increased, decreased, or unchanged?"*

- **Cost:** ~3 h total on P100.
- Train jointly with a shared trunk: the mask supervision measurably improves the
  VQA head, and it is one model to serve instead of two.

---

### M6 — `fusion` · Optical–SAR joint analysis *(mandatory M-5)*

BigEarthNet is *natively* co-registered S1+S2 — this is the single best-matched
dataset for this requirement in existence, which is presumably why ISRO named it.

- **Architecture:** S2 branch (12-band) + S1 branch (2-band VV/VH), fused by
  cross-attention, → BEN-19 multilabel head, BCE loss.
- **Init:** BIFOLD publishes reference checkpoints on HuggingFace
  (`resnet50-s2-v0.1.1`, `resnet101-s1-v0.1.1`, `rdnet_base-all-v0.2.0`). Init
  from these and we both save time *and* get a published number to benchmark
  against.
- **Cost:** ~3 h on P100.

**The demo that wins this section.** Run three ablations — S2-only, S1-only,
fused — then **synthetically occlude the S2 image with cloud** and re-run. Optical
accuracy collapses; SAR is unaffected; fusion degrades gracefully. That is a
single chart that proves *why* the PS insists on cross-modal analysis, and it is
the most persuasive slide in the deck. Cost: one extra hour of eval.

Evaluation will use **Cartosat-2S optical + RISAT SAR** pairs, not Sentinel. So
the fusion branches must normalise per-sensor from metadata, never hardcode
Sentinel band statistics. Build this in from day one — retrofitting it is painful.

---

### M7 — `vlm` · Qwen3.5-2B-VL + QLoRA adapter (the reasoning core)

The conversational layer that turns specialist outputs into grounded prose and
handles open-ended queries the specialists do not cover.

- **Base:** Qwen3.5-2B-VL. Chosen for size, not fashion — per Unsloth, a 2B
  bf16 LoRA needs ~5 GB VRAM, comfortable on a P100; and 2B Q4 is the largest
  thing that runs at conversational speed on your CPU.
- **Method:** QLoRA — base frozen in 4-bit NF4, LoRA adapters (r=16, α=32) on all
  attention + MLP projections. Trainable params ≈ 0.5% of the model.
- **Precision: fp16.** Not bf16 — see the P100/T4 warning in §0.
- **Data:** BigEarthNet.txt captions + VQA + grounding, reformatted into a single
  instruction-tuning chat mix (~150k samples), plus ~10k synthetic
  *tool-result → natural answer* examples so the model learns to narrate M1–M6
  outputs faithfully instead of inventing.
- **Cost:** ~8 h on P100 = one full session. Budget **two sessions** for a
  restart. This is the single largest compute item; schedule it first in the week.
- **Output:** merged fp16 → GGUF Q4_K_M (~1.4 GB) + separate `mmproj` vision
  projector (~600 MB).

**On grounding the VLM:** M7 never sees raw imagery alone when specialists are
available. The agent passes it *"M2 said 'yes, 4 buildings' at 0.91 confidence;
M5a found 1,204 changed pixels in the NE quadrant"* and M7 writes the answer.
This is what makes outputs evidence-grounded rather than hallucinated — and it is
the difference between passing and failing the PS's core novelty claim.

---

### Training budget

| Model | GPU-h | Depends on | Order |
|---|---:|---|---|
| M1 `rsclip` | 4 | — | **1st** |
| M7 `vlm` | 8–16 | — (parallel-safe) | **1st** (own session) |
| M2 `vqa` | 1 | M1 | 2nd |
| M3 `caption` | 2 | M1 | 2nd |
| M4 `ground` | 3 | M1 | 2nd |
| M6 `fusion` | 3 | M1 | 2nd |
| M5 `change` | 3 | M1 | 3rd |
| Eval + ablations | 3 | all | 4th |
| **Total** | **~27–35** | | **~2 weeks** at 30 h/week |

Comfortable inside two weeks of Kaggle's free quota, with a whole week of slack.
Since there is no time pressure, use the slack for the ablation table — that is
where the marks are.

---

## 4. Hosting decision: **llama.cpp, not Ollama**

You asked whether to run locally with Ollama. **Run locally — yes. With Ollama —
no.** Here is the concrete, checkable reason.

Fine-tuned vision models export as **two** GGUF files: the language model and a
separate `mmproj` vision projector. **Ollama cannot load a separate mmproj for an
imported custom model.** This is not speculation — it is two open issues on the
Ollama repository:

- [ollama#14730](https://github.com/ollama/ollama/issues/14730) — imported GGUF
  with mmproj fails to load; *the same files work under llama.cpp's `--mmproj`*.
- [ollama#9967](https://github.com/ollama/ollama/issues/9967) — Modelfiles
  specifying mmproj GGUFs silently **lose vision capability**.

Ollama's May 2026 multimodal rebuild covers *official* model families (Llama 4,
Gemma 3, Qwen2.5-VL). **Our model is a custom fine-tune — the exact case that
does not work.** Silent loss of vision is the worst possible failure mode: the
model still answers, just blind, and you might not notice until a judge asks.

`llama.cpp`'s `llama-server` supports `--mmproj` directly, serves an OpenAI-
compatible HTTP API, and is a single binary with no daemon.

### The serving stack

| Layer | Runtime | Why | Latency (your CPU) |
|---|---|---|---|
| M1–M6 | **ONNX Runtime**, CPU | 10–100M params; already proven — your `export_onnx.py` works | 20–150 ms |
| M7 | **llama.cpp `llama-server`**, Q4_K_M | only runtime that loads custom VLM + mmproj | ~4–8 s |
| Agent | **LangGraph** in FastAPI | §5 | — |
| Dashboard | **Next.js 15** (your existing stack) | already built | — |

```bash
llama-server -m models/m7-satquery-vlm-Q4_K_M.gguf \
             --mmproj models/m7-mmproj-f16.gguf \
             --host 127.0.0.1 --port 8080 -c 4096 -t 8
```

Everything runs offline on your laptop. **No API keys, no rate limits, no network
on demo day** — which also means no way to lose the demo to venue wifi. Mention
that when presenting; judges have watched too many demos die on a hotel network.

### ⚠️ ONNX export: pass `dynamo=False`

Found by testing, and it would have cost a Kaggle session. torch 2.12's default
**dynamo exporter silently ignores `dynamic_axes`**. The export appears to
succeed, loads fine, and returns a correctly-shaped unit-norm vector at
batch size 1 — then fails at batch 2:

```
Reshape node 'node_view_2': input {50,2,2304}, requested {50,1,3,768}
```

It also splits the model into `m1.onnx` (1.2 MB graph) + `m1.onnx.data`
(385.8 MB weights), so downloading only the `.onnx` from Kaggle gives you a
weightless shell.

`dynamo=False` uses the legacy exporter and fixes both: **one self-contained
386 MB file**, batch 2 works, max abs diff vs PyTorch **1.3e-07**, cosine
similarity **1.000000**.

Two lessons baked into `scripts/smoke_test_m1.py`:

- **Always verify an export at batch > 1.** The first version of that test
  checked only batch 1, passed, and missed this entirely.
- **Always compare ONNX output against PyTorch numerically.** Shape and unit
  norm prove nothing — a randomly-initialised tower passes both.

Run `python scripts/verify_onnx_export.py` after every export.

Keep a free Groq or HF Inference endpoint wired behind a feature flag as a
break-glass fallback, but demo local.

---

## 5. Wiring the seven models: LangGraph

LangGraph 1.2 (May 2026) is the right choice, and specifically because of one
feature that maps onto a PS requirement rather than because it is popular.

**Every state transition is checkpointed.** That checkpoint stream *is* the
"auditable execution summary containing the selected task, model/tool names, and
key parameters" the PS demands. We get the deliverable as a by-product of the
architecture instead of building a separate logging system that can drift out of
sync with what actually ran.

### Graph shape

```
                    ┌──────────────┐
   query + images →│  INGEST      │  GeoTIFF parse, CRS check, co-registration,
                    │              │  modality detect (optical/SAR/pair)
                    └──────┬───────┘
                           ↓
                    ┌──────────────┐
                    │  VALIDATE    │  → REJECT with a reason if incompatible
                    └──────┬───────┘     (e.g. "change-VQA needs 2 images, got 1")
                           ↓
                    ┌──────────────┐
                    │  ROUTE       │  intent × input-config → tool plan
                    └──┬─┬─┬─┬─┬─┬─┘
          ┌────────────┘ │ │ │ │ └────────────┐
          ↓         ↓    ↓ ↓ ↓ ↓              ↓
        [M2]      [M3] [M4][M5][M6]         (parallel where independent)
          └────────────┬─┬─┬─┬─┴──────────────┘
                       ↓
                ┌──────────────┐
                │  SYNTHESISE  │  M7 narrates specialist outputs
                └──────┬───────┘
                       ↓
                ┌──────────────┐
                │  EVIDENCE    │  overlays, confidence, trace, PDF report
                └──────────────┘
```

**Routing is a hybrid, and deliberately so.** A hard table handles input
compatibility — 2 images + "what changed" → M5, always, no LLM involved. M7 only
disambiguates genuinely ambiguous *intent*. Pure-LLM routing is non-deterministic
and will eventually pick the wrong tool in front of a judge; pure-rule routing
cannot handle open language. The hybrid is both defensible and demoable, and when
a judge asks "how do you know it picked the right model?", you can show them the
table.

The `REJECT` path matters more than it looks: the PS explicitly requires "input
upload and compatibility checking". A system that *correctly refuses* a
single-image change-detection request demonstrates real validation. Most teams
will silently return garbage.

### The registry

`agent/registry.py` holds one declarative entry per model — name, version, task
tags, accepted modalities, required image count, ONNX path, input spec, and
published metrics. The router only ever selects from this registry, and the trace
records exactly which registry entry ran with which parameters. Adding a model
later is one dict entry, not a code change.

---

## 6. Obsidian — yes, and it is a genuine differentiator

Short answer: **yes, and I recommend it — but not as an ML component.** Let me be
precise, because there is a lot of nonsense written about this.

**What Obsidian is not:** an inference engine, a vector database, a model server,
or an agent framework. It cannot run or train any model. Anyone claiming
otherwise is confused.

**What it is:** a viewer over a folder of plain markdown files, with wikilinks
and a force-directed graph view.

**Why that turns out to be exactly what this PS needs.** Re-read the requirement:

> *"provide an auditable execution summary containing the selected task,
> model/tool names, and key parameters"* … *"downloadable reports"*

Every other team will satisfy this with a JSON blob in a collapsible `<details>`
panel. Here is the alternative:

**Every agent run writes a markdown note into an Obsidian vault.**

```markdown
---
run_id: 2026-09-07T18-42-11Z-a3f9
query: "What changed between these two dates?"
input_config: bi-temporal-pair
models_invoked: [M5a-change-v1.2, M5b-changevqa-v1.2, M7-vlm-qlora-v1.0]
confidence: 0.87
latency_ms: 4820
aoi: "[[AOI-Ahmedabad-23.02N-72.57E]]"
---

# Run a3f9 — bi-temporal change

**Answer.** Built-up area increased. 1,204 px (3.2% of scene) changed,
concentrated in the north-east quadrant.

![[evidence/a3f9-changemap.png]]

## Execution trace
| step | model | key params | ms | conf |
|---|---|---|---|---|
| route   | rule-table       | intent=change, n_images=2 |    3 | — |
| M5a     | [[M5-change]]    | thresh=0.5, tile=256      | 1180 | 0.91 |
| M5b     | [[M5-change]]    | top_k=1                   |  240 | 0.83 |
| M7      | [[M7-vlm]]       | temp=0.2, max_tok=256     | 3400 | — |

Related: [[M5-change]] · [[CDVQA]] · [[AOI-Ahmedabad-23.02N-72.57E]]
```

Because every run links to model notes, dataset notes and AOI notes, **Obsidian's
graph view renders the live provenance graph of the entire system** — every query
ever run, every model that touched it, every region analysed, as a navigable
network. Open that on the projector and it is immediately obvious that this is a
real orchestrated system and not a wrapper around one API.

Three reasons this is the right call:

1. **It costs almost nothing.** We are writing markdown files. Maybe 150 lines.
2. **Zero runtime dependency.** The vault is a folder. The backend writes files;
   Obsidian only *reads* them. If Obsidian is not installed, everything still
   works — you just lose the pretty view. Never put Obsidian in the request path.
3. **It doubles as the report deliverable.** The same markdown renders to PDF for
   the "downloadable reports" requirement.

Optional extra: the community **Local REST API** plugin exposes the vault on
localhost, so the agent can *read back* prior runs — "have we analysed this AOI
before?" — giving the system genuine longitudinal memory across sessions. Nice if
time allows; skip it if not.

**Recommendation: build it.** Highest ratio of judge-impact to effort in the
entire project.

---

## 7. Real-time satellite imagery

**Copernicus Data Space Ecosystem** — free account, free tier with monthly quota.
It is the only free source that provides genuine **co-registered Sentinel-1 SAR +
Sentinel-2 optical** with real georeferencing, which is precisely the input the PS
defines and what ISRO will evaluate against (Cartosat-2S + RISAT pairs).

- **STAC API** — search by bounding box, date range, cloud cover.
- **openEO API** — server-side band math and mosaicking; do the heavy lifting
  before download so we pull megabytes, not gigabytes.
- **S3** — bulk product access.

Flow: user draws an AOI → STAC finds the nearest S2 and S1 scenes → openEO
subsets and co-registers → GeoTIFF lands in the pipeline → agent routes it.

Live queries against real imagery of *any* region on Earth, at demo time, is
something almost no team will attempt.

### Borrowing from `gods-eye-view`

The repo you linked is **MIT-licensed** (so we can reuse it freely, with
attribution) and built on CesiumJS. It is a real-time tracking visualiser, not an
analysis tool, so we take the presentation layer and none of the analysis:

| Take | Why | Cost |
|---|---|---|
| CesiumJS 3D globe | AOI selection on a real globe beats a bounding-box form | medium |
| **NASA FIRMS** live fire detections | keyless; "analyse this active fire" is a spectacular live demo | low |
| **USGS** earthquakes (24 h) | keyless; instant disaster-response scenario | low |
| **CelesTrak** orbits | shows *which* satellite took the image, and when it passes next | low |
| Sensor view modes (FLIR/night-vision) | pure aesthetics, but it is genuinely striking | low |

**Skip:** the OpenAI Realtime voice layer (needs a paid key — violates the free
constraint), aircraft/vessel tracking (irrelevant to the PS).

The FIRMS integration is the standout: a judge picks a fire burning *right now*,
we pull today's Sentinel pass over it, and the agent runs change detection
against last month. That is a live, unscripted, end-to-end demonstration of every
mandatory capability at once.

---

## 8. Repository layout

```
satquery-core/
├── docs/
│   ├── MASTER_PLAN.md          ← this file
│   ├── MODEL_CARDS.md          per-model card: data, recipe, metrics, caveats
│   └── EVAL_PROTOCOL.md        exact splits + metrics, frozen before training
├── models/                     M1–M7 definitions (train + infer, shared code)
├── notebooks/                  one Kaggle notebook per model
├── agent/
│   ├── registry.py             declarative model registry
│   ├── graph.py                LangGraph state machine
│   ├── router.py               hybrid rule + LLM routing
│   ├── trace.py                execution trace → Obsidian markdown
│   └── tools/                  one thin wrapper per model
├── serve/
│   ├── api.py                  FastAPI; mounts the graph
│   └── onnx_pool.py            warm ONNX sessions
├── data/                       loaders, band normalisation, GeoTIFF/CRS handling
├── scripts/                    download, preprocess, export, benchmark
└── vault/                      Obsidian vault (run notes, model notes, AOIs)
```

The dashboard stays in `satquery/` — Next.js 15 + React 19 + Tailwind 4, already
built — and talks to `serve/api.py` over HTTP. Clean separation; no rewrite.

---

## 9. What no other team will have

Ranked by how hard they are to copy:

1. **The cloud-occlusion ablation (M6).** Empirical proof that SAR rescues optical
   under cloud. One chart, unarguable, directly justifies the PS's premise.
2. **The Obsidian provenance graph.** Every run, model and AOI as a live
   navigable network. Nobody else will think of this.
3. **Live FIRMS → Copernicus → analysis.** Unscripted, real, today's imagery.
4. **The honest ablation table.** Blind baselines and majority baselines for every
   model. Your existing `vqa/RESULTS.md` already does this, and it is the single
   most credible artefact in the repo — most teams report one number with no
   baseline and cannot answer "how do you know the image is being used at all?"
5. **Correct refusal.** The system explains *why* an input cannot answer a query.
6. **Both** M3 and M4 when the PS requires only one.

---

## 10. Immediate next steps

### Kaggle phone verification — exactly where

This is the one hard blocker: **without it the Accelerator dropdown stays greyed
out and you get CPU only.**

1. Sign in at **kaggle.com**
2. Click your **avatar** (top right) → **Settings**
3. Scroll to the **Phone Verification** section → enter your number → enter the SMS code
4. Then, in any notebook: right sidebar → **Session options / Settings** →
   **Accelerator** → pick **GPU P100** (or T4 ×2)

Direct link: **https://www.kaggle.com/settings**

Two known snags: **VoIP numbers (Google Voice, TextNow, most virtual numbers) are
rejected** — use a real mobile SIM. And one number can only verify one account.
Verification is usually instant; if the dropdown is still greyed out, reload the
notebook page, as the session caches your entitlement at load time.

Check your remaining quota any time at the same Settings page — the free tier is
30 GPU-hours per week, resetting weekly (not monthly).

| # | Task | Where | Blocking? |
|---|---|---|---|
| 1 | Create Kaggle account, verify phone (unlocks GPU) | kaggle.com/settings | **yes — do this first** |
| 2 | Create Copernicus Data Space account | dataspace.copernicus.eu | for §7 |
| 3 | Download BigEarthNet.txt parquet (467 MB) | local | no |
| 4 | Freeze `EVAL_PROTOCOL.md` — splits and metrics, **before** training | local | no |
| 5 | Build the M1 Kaggle notebook | notebooks/ | after 1 |
| 6 | Scaffold registry + LangGraph with stub models | agent/ | no |

Steps 3, 4 and 6 run on your laptop right now and do not need the GPU. Step 6 in
particular is worth doing early: with stubbed models, the entire agent, API and
dashboard can be built and demoed *before a single model finishes training*. That
de-risks the schedule — if training slips, the system still runs.

Phone verification on Kaggle is the one true blocker. Everything else is parallel.

---

## Sources

- [BigEarthNet.txt (arXiv:2603.29630)](https://arxiv.org/abs/2603.29630) · [txt.bigearth.net](https://txt.bigearth.net) · [HF dataset](https://huggingface.co/datasets/BIFOLD-BigEarthNetv2-0/BigEarthNet.txt)
- [BigEarthNet v2.0 / reBEN](https://bigearth.net/)
- [RSVQA (Lobry et al., TGRS 2020)](https://arxiv.org/abs/2003.07333)
- [CDVQA — Change Detection Meets VQA (arXiv:2112.06343)](https://arxiv.org/abs/2112.06343)
- [Kaggle free GPU quota](https://www.kaggle.com/docs/notebooks)
- [Unsloth — GGUF export](https://unsloth.ai/docs/basics/inference-and-deployment/saving-to-gguf) · [Qwen3.5 fine-tuning](https://unsloth.ai/docs/models/qwen3.5/fine-tune)
- [ollama#14730 — mmproj import failure](https://github.com/ollama/ollama/issues/14730) · [ollama#9967 — Modelfile mmproj loses vision](https://github.com/ollama/ollama/issues/9967)
- [llama.cpp `--mmproj`](https://github.com/ggml-org/llama.cpp/discussions/22190)
- [LangGraph durable execution](https://docs.langchain.com/oss/python/langgraph/durable-execution)
- [Copernicus Data Space APIs](https://dataspace.copernicus.eu/analyse/apis)
- [bilawalsidhu/gods-eye-view (MIT)](https://github.com/bilawalsidhu/gods-eye-view)
