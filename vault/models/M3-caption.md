---
model_id: "M3"
name: "caption"
version: "1.0.0"
runtime: "torch"
n_images: 1
trainable_on: "kaggle-p100 ~2h"
trained: true
tags: ["satquery/model"]
---

# M3 — `caption`

**Tasks.** caption
**Modalities.** optical, sar
**Images required.** 1
**Trainable params.** 1.89M
**Training data.** [[BigEarthNet.txt-geographically-anchored-captions]]
**Compute.** kaggle-p100 ~2h

## Measured metrics

```json
{
