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
  "test_changevqa_acc": 0.7947019867549668,
  "majority_baseline": 0.47019867549668876,
  "n_train": 684,
  "n_test": 151,
  "answers": [
    "increased",
    "decreased",
    "unchanged"
  ],
  "supervision": "dNDVI threshold 0.10 \u2014 spectral vegetation change, not semantic change labels"
}
```

## Notes

Siamese M1 -> feature differencing -> light U-Net decoder -> binary mask. Produces the spatial evidence overlay.
