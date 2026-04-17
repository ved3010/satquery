"""
A small shared remote-sensing encoder, and the six task heads that sit on it.

WHY SMALL. This laptop has no NVIDIA GPU (Intel Iris Xe, 4 cores). A ViT-B/32
RS-CLIP is 160 M parameters and is not CPU-trainable in any reasonable time, so
the full M1 belongs on Kaggle. What IS trainable here is a compact CNN encoder
(~1.5 M parameters) shared by every head. That gives real, measured numbers for
all six specialists today rather than seven stubs.

The architecture mirrors the Kaggle plan exactly -- one encoder, many heads --
so swapping in the ViT tower later is a constructor change, not a redesign.

    input   14 x 120 x 120   (12 Sentinel-2 bands + Sentinel-1 VV/VH)
    encoder  4 conv blocks, 32 -> 64 -> 128 -> 256, BN + ReLU + stride-2
    output   256-d pooled embedding, plus the 8x8x256 spatial grid for grounding

Heads
    M1  projection -> contrastive image/text embedding
    M3  caption decoder (GRU over the pooled embedding)
    M4  box regression from the spatial grid
    M6  multilabel land cover (11 WorldCover classes)
    M5a siamese feature difference -> change mask
    M5b siamese difference + question -> change answer
"""
from __future__ import annotations

import torch
import torch.nn as nn
import torch.nn.functional as F

N_S2, N_S1 = 12, 2
IN_CH = N_S2 + N_S1
N_CLASSES = 11          # ESA WorldCover
EMB = 256


def conv_block(cin: int, cout: int) -> nn.Sequential:
    return nn.Sequential(
        nn.Conv2d(cin, cout, 3, padding=1, bias=False),
        nn.BatchNorm2d(cout), nn.ReLU(inplace=True),
        nn.Conv2d(cout, cout, 3, stride=2, padding=1, bias=False),
        nn.BatchNorm2d(cout), nn.ReLU(inplace=True),
    )


class RSEncoder(nn.Module):
    """14-channel CNN encoder. Returns (pooled 256-d, spatial 256x8x8)."""

    def __init__(self, in_ch: int = IN_CH, emb: int = EMB):
        super().__init__()
        self.in_ch = in_ch
        self.stem = nn.Sequential(
            conv_block(in_ch, 32),      # 120 -> 60
            conv_block(32, 64),         # 60  -> 30
            conv_block(64, 128),        # 30  -> 15
            conv_block(128, emb),       # 15  -> 8
        )

    def forward(self, x):
        f = self.stem(x)                       # (B, 256, 8, 8)
        return F.adaptive_avg_pool2d(f, 1).flatten(1), f


class TextEncoder(nn.Module):
    """Small BiGRU over a word-level vocabulary.

    A BiGRU, not mean-pooled bag-of-words. The v1 VQA model's own ablation
    showed bag-of-words scoring *below* its blind baseline on comparison
    questions, because mean-pooling discards word order and makes
    "more roads than forests" identical to "more forests than roads".
    Order-awareness is the fix, and it is why every text path here is recurrent.
    """

    def __init__(self, vocab: int, emb: int = EMB, dim: int = 128):
        super().__init__()
        self.embed = nn.Embedding(vocab, dim, padding_idx=0)
        self.gru = nn.GRU(dim, dim, batch_first=True, bidirectional=True)
        self.proj = nn.Linear(dim * 2, emb)

    def forward(self, ids, mask):
        h, _ = self.gru(self.embed(ids))              # (B, T, 2*dim)
        m = mask.unsqueeze(-1)
        pooled = (h * m).sum(1) / m.sum(1).clamp(min=1)   # masked mean over time
        return self.proj(pooled)


# --------------------------------------------------------------------------- #
# heads
# --------------------------------------------------------------------------- #
class M1Clip(nn.Module):
    """Contrastive image/text alignment — the domain-adaptation core."""

    def __init__(self, vocab: int, emb: int = EMB):
        super().__init__()
        self.enc = RSEncoder(emb=emb)
        self.txt = TextEncoder(vocab, emb)
        self.img_proj = nn.Linear(emb, emb)
        self.logit_scale = nn.Parameter(torch.tensor(2.6592))   # ln(1/0.07)

    def encode_image(self, x):
        pooled, _ = self.enc(x)
        return F.normalize(self.img_proj(pooled), dim=-1)

    def encode_text(self, ids, mask):
        return F.normalize(self.txt(ids, mask), dim=-1)

    def forward(self, x, ids, mask):
        return self.encode_image(x), self.encode_text(ids, mask)


class M6Fusion(nn.Module):
