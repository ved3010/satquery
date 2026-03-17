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

