---
model_id: "M2"
name: "vqa"
version: "1.0.0"
runtime: "onnx"
n_images: 1
trainable_on: "cpu 6.5min (v1) / kaggle-p100 ~40min (v2)"
trained: true
tags: ["satquery/model"]
---

# M2 — `vqa`

**Tasks.** vqa
**Modalities.** optical
**Images required.** 1
**Trainable params.** 2.5M
**Training data.** [[RSVQA-LR]]
**Compute.** cpu 6.5min (v1) / kaggle-p100 ~40min (v2)

## Measured metrics

```json
{
  "split": "RSVQA-LR test (10,004 QA pairs, 100 unseen tiles)",
  "overall_accuracy": 0.7587,
  "average_accuracy": 0.7718,
  "majority_baseline": 0.5749,
  "blind_baseline": 0.7283,
  "per_type": {
    "presence": {
      "acc": 0.9083,
      "n": 2955,
      "blind": 0.8934
    },
    "count": {
      "acc": 0.6939,
