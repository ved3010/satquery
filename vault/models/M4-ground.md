---
model_id: "M4"
name: "ground"
version: "1.0.0"
runtime: "torch"
n_images: 1
trainable_on: "kaggle-p100 ~3h"
trained: true
tags: ["satquery/model"]
---

# M4 — `ground`

**Tasks.** grounding
**Modalities.** optical, sar
**Images required.** 1
**Trainable params.** 1.67M
**Training data.** [[BigEarthNet.txt-referring-expression-+-bbox-annotations]]
**Compute.** kaggle-p100 ~3h

## Measured metrics

```json
{
