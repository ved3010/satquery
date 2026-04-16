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
