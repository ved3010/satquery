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
  "blind_ablation": {
    "captioning": {
      "n": 151,
      "majority_baseline": 0.0409,
      "next_token_acc": 0.2786
    },
    "binary": {
      "n": 595,
      "majority_baseline": 0.6016,
      "exact_match": 0.6521
    },
    "mcq": {
      "n": 443,
      "majority_baseline": 0.2695,
      "exact_match": 0.0
    },
    "bounding box": {
      "n": 180,
      "majority_baseline": 0.0075,
      "exact_match": 0.0
    }
  },
  "seconds": 211.3,
  "caveat": "Word-level vocabulary of 265 tokens over one corpus. It answers IndiaSat-style instructions about Indian Sentinel patches; it is not a general-purpose VLM. Quantitative percentages in a report come from the measured spectral indices, never from this model."
}
```

## Notes

Frozen M1 vision tower -> 17 visual prefix tokens -> 4-layer causal decoder (d=256, 2.34M trainable of 3.52M). CPU-trainable, which the 2B Qwen3.5-VL+QLoRA plan is not on this hardware (bitsandbytes is CUDA-only) -- same architecture idea at a size that fits, so the tower swaps for the Kaggle ViT-B/32 without a redesign. Greedy decoding: an auditable trace needs the same imagery and question to give the same answer. It narrates; it never supplies a number. Every percentage in a report comes from serve/analysis.py, measured off the pixels.
