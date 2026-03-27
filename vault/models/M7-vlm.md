---
model_id: "M7"
name: "vlm"
version: "1.0.0"
runtime: "torch"
n_images: 1
trainable_on: "cpu ~50min (frozen tower) / kaggle-p100 ~8-16h (2B version)"
trained: true
tags: ["satquery/model"]
---

# M7 — `vlm`

**Tasks.** synthesis, vqa, caption
**Modalities.** any
**Images required.** 1
**Trainable params.** 2.34M
**Training data.** [[IndiaSat-instruction-mix-8,962-pairs-over-985-patches]]
**Compute.** cpu ~50min (frozen tower) / kaggle-p100 ~8-16h (2B version)

## Measured metrics

```json
{
  "source": "models/reports/m7_vlm.json",
  "model": "M7",
  "architecture": "frozen M1 vision tower -> 17 visual tokens -> 4-layer causal decoder (d=256, 2.34M trainable)",
  "train_data": "IndiaSat instruction mix, 985 patches, 6196 train / 1369 test",
  "epochs": 1,
  "batch_size": 32,
  "lr": 0.0003,
  "test": {
    "captioning": {
      "n": 151,
      "majority_baseline": 0.0409,
      "next_token_acc": 0.5263
    },
    "binary": {
      "n": 595,
      "majority_baseline": 0.6016,
      "exact_match": 0.6857
    },
    "mcq": {
      "n": 443,
      "majority_baseline": 0.2695,
      "exact_match": 0.0474
    },
    "bounding box": {
      "n": 180,
      "majority_baseline": 0.0075,
      "exact_match": 0.0
    }
  },
