---
model_id: "M1"
name: "rsclip"
version: "1.0.0"
runtime: "torch"
n_images: 1
trainable_on: "kaggle-p100 ~4h"
trained: true
tags: ["satquery/model"]
---

# M1 — `rsclip`

**Tasks.** retrieval
**Modalities.** optical, sar
**Images required.** 1
**Trainable params.** 1.57M
**Training data.** [[BigEarthNet.txt-captions-x-reBEN-patches]]
**Compute.** kaggle-p100 ~4h

## Measured metrics

```json
{
  "source": "models/reports/m1_rsclip_small.json",
  "model": "M1",
  "test": {
    "i2t_R@1": 0.13907285034656525,
    "i2t_R@5": 0.5165562629699707,
    "i2t_R@10": 0.7880794405937195
  },
  "chance_R@1": 0.006622516556291391,
  "gallery": 151,
  "n_train": 684
}
```

## Notes

Domain-adaptation core. ViT-B/32 with patch-embed inflated 3->14 channels (12 S2 bands + VV/VH). Its frozen image tower is the backbone of M2, M3, M4 and M6 -- train first.
