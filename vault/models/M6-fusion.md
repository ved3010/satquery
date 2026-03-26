---
model_id: "M6"
name: "fusion"
version: "1.0.0"
runtime: "torch"
n_images: 2
trainable_on: "kaggle-p100 ~3h"
trained: true
tags: ["satquery/model"]
---

# M6 — `fusion`

**Tasks.** fusion
**Modalities.** optical, sar
**Images required.** 2
**Trainable params.** 2.48M
**Training data.** [[BigEarthNet-v2-co-registered-S1+S2,-BEN-19-multilabel]]
**Compute.** kaggle-p100 ~3h

## Measured metrics

```json
{
  "source": "models/reports/m6_fusion.json",
  "model": "M6",
  "test_mAP": 0.9149570621718361,
  "prior_baseline_mAP": 0.3423946125551708,
  "n_classes_scored": 8,
