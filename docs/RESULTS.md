# Measured results

SIH 2026 · PS 26167 · every number below is measured on a **held-out test split**
and reported **beside a baseline**. An accuracy with no baseline cannot answer
*"is the model using the image at all?"*, which is the first thing a judge should ask.

Reproduce: `python -m models.train_all` · raw JSON in `models/reports/`.

---

## Training data — IndiaSat

Built from scratch because **BigEarthNet.txt contains zero Indian data**
(10 European countries; its coordinate ranges do not overlap India). See
[MASTER_PLAN.md](MASTER_PLAN.md) §2.

| | |
|---|---:|
| Patches | **985** (all bi-temporal) |
| Raster images | **26,595** (27 layers per patch) |
| Per patch | 12 S2 bands + 2 S1 (VV/VH) + 12 S2 second-date + 1 label |
| Patch size | 120×120 px @ 10 m = 1.2 × 1.2 km |
| Ground area | ~1,418 km² |
| Disk | 580 MB compressed |
| Annotations | **8,962** — binary 3,891 · mcq 2,894 · bbox 1,192 · caption 985 |
| Splits | train 684 · val 150 · test 151 patches |
| Source scenes | 24 Sentinel scenes (8 regions × 2 dates S2, + 8 S1) |
| Regions | Ahmedabad · Ludhiana · Kochi · Sundarbans · Jaisalmer · Guwahati · Pune · Shimla |
| Climate zones | tropical monsoon, tropical savannah, arid desert, arid steppe, humid subtropical, temperate dry-winter — **all absent from BigEarthNet** |

Splits are assigned by a deterministic grid hash, so re-running is stable and
neighbouring patches — which overlap in content — never straddle train and test.

---

## Results

All six specialists are ~1.6–2.5 M parameters, sharing one 14-channel CNN
encoder, trained on **CPU** (no GPU on this machine). M7, the 2 B VLM, needs the
Kaggle GPU and is not trained here.

| model | task | metric | **result** | baseline | baseline type |
|---|---|---|---:|---:|---|
| **M6** `fusion` | optical–SAR land cover | mAP | **0.9150** | 0.3424 | class prior |
| **M3** `caption` | scene description | next-token acc | **0.9010** | 0.0743 | most-frequent token |
| **M5b** `change_vqa` | bi-temporal change | accuracy | **0.7682** | 0.4702 | majority class |
| **M2** `vqa` | single-image VQA | overall acc | **0.7587** | 0.5749 | majority class |
| **M5a** `change_map` | change mask | IoU | **0.5090** | — | — |
| **M4** `ground` | text-guided box | mean IoU | **0.3082** | 0.1983 | mean training box |
| **M1** `rsclip` | image↔text retrieval | R@1 | **0.1391** | 0.0066 | random (1/151) |

Every model beats its baseline. M7 is the only registry entry still untrained.

---

## M6 — the ablation that justifies cross-modal analysis

The PS asserts that SAR complements optical because it sees through cloud. This
measures it. Cloud is simulated by replacing 50% of the optical scene with a
bright near-uniform field, as real cloud does.

| condition | test mAP | Δ vs clear |
|---|---:|---:|
| **fused (S2+S1)** | **0.9150** | — |
| S2 only | 0.7306 | — |
| S1 only | 0.6869 | — |
| fused, 50% cloud | 0.8467 | **−0.068** |
| S2 only, 50% cloud | 0.6508 | **−0.080** |
| S1 only, 50% cloud | 0.6869 | **0.000** |

Three things fall out, and they are exactly the PS's premise:

1. **Fusion beats either sensor alone** by ~18 mAP points.
2. **SAR is completely unaffected by cloud** — 0.6869 either way, to four decimals.
3. **Fusion degrades gracefully** where optical alone degrades more.

This is the strongest single chart in the project. 8 of 11 WorldCover classes
appear in the test split and are scored; the other 3 are absent from these
regions and are excluded rather than scored as free zeros.

---

## Honest caveats — read before putting a number on a slide

**M3's 0.9010 is inflated by templated captions.** The captions are generated
from WorldCover labels, so much of each sentence is boilerplate the model learns
fast. The *content* is right — it described a central-Ahmedabad tile as
*"predominantly built up … arid steppe hot climate zone … approximately 97% of
the scene"* — but do **not** present this as comparable to a free-text CIDEr
score on VRSBench.

**M5 is supervised on ΔNDVI, not semantic change labels.** WorldCover is a
single 2021 product and provides no change ground truth. So M5 measures
**vegetation** change, which ΔNDVI genuinely answers — and nothing else. Asked
*"has the built-up area increased?"* it still reports vegetation change. The
runtime now appends an explicit scope note whenever the question is not about
vegetation, so the trace cannot mislead. Real semantic change detection needs
LEVIR-CD or SECOND masks.

**M4's 0.3082 IoU is weak in absolute terms.** It beats the mean-training-box
baseline (0.1983) but Acc@0.5 is only 0.2389. Grounding from 798 training boxes
with a 1.6 M-parameter model is genuinely hard; this is the model most improved
by moving to the Kaggle backbone.

**M1's R@1 of 0.1391 is on a 151-patch gallery.** R@k depends on gallery size —
always report *n* beside it, or the number is not comparable to any published
figure. 21× chance is the honest framing.

**M2 has a known defect, documented since v1.** On comparison questions it
scores *below* its own blind (question-only) ablation, −0.8 pt, because
mean-pooled bag-of-words discards word order: *"more roads than forests"* and
*"more forests than roads"* are the same vector. The fix is the BiGRU encoder
used in every other model here.

**All test splits are small** (151 patches, 180 boxes). Per-class numbers carry
several points of sampling noise. Do not over-claim any single figure.

---

## What runs live

Verified end-to-end on imagery fetched from the map at query time:

| query | routed to | real models | latency |
|---|---|---|---:|
| "Describe the land-cover visible in this image." | `caption` | M3 | 6.7 s * |
| "Highlight the water body referred to in the query." | `grounding` | M4 | 196 ms |
| "Has the built-up area increased, decreased, or unchanged?" | `change_vqa` | M5a + M5b | 754 ms |
| "What changed between these two dates?" *(one image)* | — | — | **refused, 10 ms** |

\* first call includes torch import and model load; warm calls are ~200 ms.

The refusal is a feature, not a failure: *"Change analysis needs two images
acquired at different times; one was supplied."* PS 26167 requires input
compatibility checking, and a system that correctly refuses an impossible
request demonstrates it where one that silently returns garbage does not.

---

## Still to do on Kaggle

M7 (Qwen3.5-2B-VL + QLoRA) is the one model that cannot train on this laptop —
`bitsandbytes` is CUDA-only. Until it lands, the agent's synthesis step reports
specialist findings verbatim and says so, rather than inventing prose.

The Kaggle notebook (`notebooks/M1_rsclip_indiasat.ipynb`) trains the full-size
M1 (ViT-B/32, 160 M params) which should lift M3/M4/M6 further, since all three
share the encoder.
