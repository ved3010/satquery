---
model_id: "M1"
name: "rsclip"
version: "1.0.0"
runtime: "torch"
n_images: 1
trainable_on: "kaggle-p100 ~4h"
trained: true
tags: ["satquery/model"]
---

# M1 — `rsclip`

**Tasks.** retrieval
**Modalities.** optical, sar
**Images required.** 1
**Trainable params.** 1.57M
**Training data.** [[BigEarthNet.txt-captions-x-reBEN-patches]]
**Compute.** kaggle-p100 ~4h

## Measured metrics

```json
{
  "source": "models/reports/m1_rsclip_small.json",
  "model": "M1",
