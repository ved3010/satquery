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
  "source": "models/reports/m4_ground.json",
  "model": "M4",
  "test_mean_iou": 0.30823880434036255,
  "test_acc@0.5": 0.2388888888888889,
  "mean_box_baseline_iou": 0.19834666209956447,
  "n_train": 798,
  "n_test": 180
}
```

## Notes

M1 patch grid + text tower -> 2-layer cross-attention -> box head. L1 + generalised IoU loss. Answers 'highlight the water body'.
