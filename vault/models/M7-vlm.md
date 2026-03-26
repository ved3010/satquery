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
