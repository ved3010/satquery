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
    """Optical-SAR multilabel land cover.

    Two branches so each sensor can be ablated independently -- that is what
    makes the cloud-occlusion experiment possible (optical collapses, SAR does
    not, fusion degrades gracefully).
    """

    def __init__(self, n_classes: int = N_CLASSES, emb: int = EMB):
        super().__init__()
        self.s2 = RSEncoder(in_ch=N_S2, emb=emb)
        self.s1 = RSEncoder(in_ch=N_S1, emb=emb)
        self.head = nn.Sequential(
            nn.Linear(emb * 2, emb), nn.ReLU(inplace=True),
            nn.Dropout(0.2), nn.Linear(emb, n_classes))

    def forward(self, s2, s1):
        a, _ = self.s2(s2)
        b, _ = self.s1(s1)
        return self.head(torch.cat([a, b], 1))


class M3Caption(nn.Module):
    """Prefix-style captioner: image embedding conditions a GRU decoder."""

    def __init__(self, vocab: int, emb: int = EMB, dim: int = 256):
        super().__init__()
        self.enc = RSEncoder(emb=emb)
        self.to_h = nn.Linear(emb, dim)
        self.embed = nn.Embedding(vocab, dim, padding_idx=0)
        self.gru = nn.GRU(dim, dim, batch_first=True)
        self.out = nn.Linear(dim, vocab)

    def forward(self, x, ids):
        pooled, _ = self.enc(x)
        h0 = torch.tanh(self.to_h(pooled)).unsqueeze(0)     # (1, B, dim)
        y, _ = self.gru(self.embed(ids), h0)
        return self.out(y)

    @torch.no_grad()
    def generate(self, x, bos: int, eos: int, max_len: int = 60):
        pooled, _ = self.enc(x)
        h = torch.tanh(self.to_h(pooled)).unsqueeze(0)
        tok = torch.full((x.size(0), 1), bos, dtype=torch.long, device=x.device)
        out = []
        for _ in range(max_len):
            y, h = self.gru(self.embed(tok), h)
            tok = self.out(y[:, -1]).argmax(-1, keepdim=True)
            out.append(tok)
            if (tok == eos).all():
                break
        return torch.cat(out, 1)


class M4Ground(nn.Module):
    """Text-guided box regression.

    The text embedding modulates the spatial grid (FiLM-style scale/shift)
    before pooling, so the predicted box depends on *which* phrase was asked --
    without that conditioning the head would collapse to one box per image.
    """

    def __init__(self, vocab: int, emb: int = EMB):
        super().__init__()
        self.enc = RSEncoder(emb=emb)
        self.txt = TextEncoder(vocab, emb)
        self.film = nn.Linear(emb, emb * 2)
        self.head = nn.Sequential(
            nn.Linear(emb, 128), nn.ReLU(inplace=True), nn.Linear(128, 4))

    def forward(self, x, ids, mask):
        _, grid = self.enc(x)                      # (B, 256, 8, 8)
        t = self.txt(ids, mask)
        gamma, beta = self.film(t).chunk(2, dim=-1)
        grid = grid * (1 + gamma[:, :, None, None]) + beta[:, :, None, None]
        pooled = F.adaptive_avg_pool2d(F.relu(grid), 1).flatten(1)
        # sigmoid keeps boxes inside the frame; predicts (x0, y0, x1, y1)
        return torch.sigmoid(self.head(pooled))


class M5Change(nn.Module):
    """Siamese bi-temporal model with two heads.

    A shared trunk encodes both dates; the difference feeds a mask decoder
    (M5a) and an answer classifier (M5b). Sharing means the mask supervision
    also improves the answer head, and it is one model to serve, not two.
    """

    def __init__(self, vocab: int, n_answers: int, emb: int = EMB):
        super().__init__()
        self.enc = RSEncoder(in_ch=N_S2, emb=emb)
        self.txt = TextEncoder(vocab, emb)
        self.mask_head = nn.Sequential(
            nn.Conv2d(emb, 128, 3, padding=1), nn.ReLU(inplace=True),
            nn.Conv2d(128, 32, 3, padding=1), nn.ReLU(inplace=True),
            nn.Conv2d(32, 1, 1))
        self.ans_head = nn.Sequential(
            nn.Linear(emb * 2, emb), nn.ReLU(inplace=True),
            nn.Dropout(0.2), nn.Linear(emb, n_answers))

    def forward(self, a, b, ids=None, mask=None):
        pa, fa = self.enc(a)
        pb, fb = self.enc(b)
        diff = fb - fa
        logits_mask = F.interpolate(self.mask_head(diff), size=a.shape[-2:],
                                    mode="bilinear", align_corners=False)
        ans = None
        if ids is not None:
            t = self.txt(ids, mask)
            pooled = F.adaptive_avg_pool2d(diff, 1).flatten(1)
            ans = self.ans_head(torch.cat([pooled, t], 1))
        return logits_mask.squeeze(1), ans


def count_params(m: nn.Module) -> float:
    return sum(p.numel() for p in m.parameters() if p.requires_grad) / 1e6


if __name__ == "__main__":
    V = 500
    for name, m, args in [
        ("M1 rsclip",  M1Clip(V),      (torch.randn(2, IN_CH, 120, 120),
                                        torch.randint(1, V, (2, 20)), torch.ones(2, 20))),
        ("M3 caption", M3Caption(V),   (torch.randn(2, IN_CH, 120, 120),
                                        torch.randint(1, V, (2, 20)))),
        ("M4 ground",  M4Ground(V),    (torch.randn(2, IN_CH, 120, 120),
                                        torch.randint(1, V, (2, 20)), torch.ones(2, 20))),
        ("M5 change",  M5Change(V, 5), (torch.randn(2, N_S2, 120, 120),
                                        torch.randn(2, N_S2, 120, 120),
                                        torch.randint(1, V, (2, 20)), torch.ones(2, 20))),
        ("M6 fusion",  M6Fusion(),     (torch.randn(2, N_S2, 120, 120),
                                        torch.randn(2, N_S1, 120, 120))),
    ]:
        out = m(*args)
        shapes = ([tuple(o.shape) for o in out if o is not None]
                  if isinstance(out, tuple) else [tuple(out.shape)])
        print(f"{name:<12} {count_params(m):5.2f}M params  out {shapes}")
