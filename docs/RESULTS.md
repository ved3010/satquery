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
