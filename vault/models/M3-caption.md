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
  "source": "models/reports/m3_caption.json",
  "model": "M3",
  "test_token_acc": 0.9005385392123864,
  "mode_token_baseline": 0.07434761201378631,
  "n_train": 684,
  "n_test": 151,
  "sample": "this satellite image captured during the winter season in india ahmedabad gujarat showcases a predominantly built up landscape within the arid steppe hot climate zone built up covers approximately 97 of the scene"
}
```

## Notes

Prefix-tuned: M1 embedding -> 10 soft prompt tokens -> small causal decoder. ~50ms on CPU vs ~4s for M7, and a working fallback if the VLM fails on demo day.
