"""
M7 — a small vision-language model for remote sensing, trainable on CPU.

WHY THIS SHAPE. The registry's original M7 is Qwen3.5-2B-VL + QLoRA, which
needs a CUDA GPU (`bitsandbytes` is CUDA-only) and is not trainable on this
laptop. Rather than ship a stub, this is the same architecture idea at a size
that actually fits: a frozen remote-sensing vision tower, a learned projector
that turns an image into prefix tokens, and a small causal transformer decoder
that follows an instruction about that image.

    image 14x120x120 --[frozen M1 encoder]--> 256-d pooled + 256x8x8 grid
                     --[projector]---------->  1 + 16 visual tokens
    [visual tokens][<bos>] instruction [<sep>] answer [<eos>]
                     --[4-layer causal decoder]--> next-token logits

Loss is computed on the answer span only, so the model learns to *answer*
rather than to reconstruct the question.

The vision tower is frozen and its features are cached once, which is why this
trains in minutes on four cores instead of hours: it is stage-1 LLaVA-style
projector training, not full fine-tuning. Swapping the frozen tower for the
Kaggle ViT-B/32 is a constructor change, not a redesign — exactly the property
`models/backbone.py` was built for.
"""
from __future__ import annotations

import math

import torch
import torch.nn as nn
import torch.nn.functional as F

from models.backbone import EMB, IN_CH, RSEncoder

N_VIS = 17           # 1 global token + 4x4 pooled grid
GRID = 4


class M7VLM(nn.Module):
    def __init__(self, vocab: int, d: int = 256, layers: int = 4,
                 heads: int = 4, ff: int = 512, maxlen: int = 128,
                 dropout: float = 0.1):
        super().__init__()
        self.d, self.maxlen, self.vocab = d, maxlen, vocab
        self.enc = RSEncoder(in_ch=IN_CH, emb=EMB)          # frozen at train time
        self.proj_global = nn.Linear(EMB, d)
        self.proj_grid = nn.Linear(EMB, d)
        self.vis_norm = nn.LayerNorm(d)

        self.tok = nn.Embedding(vocab, d, padding_idx=0)
        self.pos = nn.Embedding(maxlen, d)
        layer = nn.TransformerEncoderLayer(
            d, heads, ff, dropout=dropout, batch_first=True,
            norm_first=True, activation="gelu")
        self.dec = nn.TransformerEncoder(layer, layers)
        self.ln = nn.LayerNorm(d)
        self.head = nn.Linear(d, vocab)
        self.head.weight = self.tok.weight                  # tied embeddings
        self.apply(self._init)

    @staticmethod
    def _init(m):
        """GPT-style small init. With torch's default N(0,1) embedding and
        tied output weights the initial logits have a standard deviation of
        sqrt(d) ~ 16, so the first epoch is spent shrinking the head instead
        of learning. std=0.02 starts the loss at ln(vocab) where it belongs."""
        if isinstance(m, nn.Embedding):
            nn.init.normal_(m.weight, std=0.02)
            if m.padding_idx is not None:
                with torch.no_grad():
                    m.weight[m.padding_idx].zero_()
        elif isinstance(m, nn.Linear):
            nn.init.normal_(m.weight, std=0.02)
            if m.bias is not None:
                nn.init.zeros_(m.bias)

    # -- vision ----------------------------------------------------------- #
    @torch.no_grad()
    def encode_image(self, x):
        """Frozen tower. Returns (pooled 256, grid 256x8x8)."""
        return self.enc(x)
