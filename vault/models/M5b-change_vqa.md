---
model_id: "M5b"
name: "change_vqa"
version: "1.0.0"
runtime: "torch"
n_images: 2
trainable_on: "kaggle-p100 ~1h (shared trunk with M5a)"
trained: true
tags: ["satquery/model"]
---

# M5b — `change_vqa`

**Tasks.** change_vqa
**Modalities.** optical, sar
**Images required.** 2
**Trainable params.** 1.97M
**Training data.** [[CDVQA]]
**Compute.** kaggle-p100 ~1h (shared trunk with M5a)

## Measured metrics

```json
{
  "source": "models/reports/m5_change.json",
  "model": "M5",
  "test_mask_iou": 0.4419672566231462,
