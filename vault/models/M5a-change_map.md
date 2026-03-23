---
model_id: "M5a"
name: "change_map"
version: "1.0.0"
runtime: "torch"
n_images: 2
trainable_on: "kaggle-p100 ~2h (shared trunk with M5b)"
trained: true
tags: ["satquery/model"]
---

# M5a — `change_map`

**Tasks.** change_map
**Modalities.** optical, sar
**Images required.** 2
**Trainable params.** 1.97M
**Training data.** [[LEVIR-CD]]
**Compute.** kaggle-p100 ~2h (shared trunk with M5b)

## Measured metrics

```json
{
  "source": "models/reports/m5_change.json",
  "model": "M5",
  "test_mask_iou": 0.4419672566231462,
