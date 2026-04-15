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

Shares M5a's siamese trunk; mask supervision improves the VQA head and it is one model to serve instead of two.
