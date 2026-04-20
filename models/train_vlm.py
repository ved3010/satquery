"""
Train M7 -- the small remote-sensing VLM -- on the IndiaSat instruction mix.

    python -m models.train_vlm                 # ~15 epochs, CPU
    python -m models.train_vlm --epochs 8      # shorter

The vision tower is initialised from the trained M1 encoder and frozen, so its
features are computed once for all 985 patches and reused every epoch. That is
what makes this trainable on four CPU cores: the only thing learning is the
projector and the 4-layer decoder (2.3 M parameters).

Reported against baselines, because an accuracy with no baseline cannot answer
"is the model using the image at all?":

    binary (yes/no)  vs the majority answer in train
    mcq (a/b/c/d)    vs the majority option in train
    captioning       next-token accuracy
    blind ablation   the same weights evaluated with the visual tokens zeroed
"""
from __future__ import annotations

import argparse
import json
import os
import sys
import time
from collections import Counter

import numpy as np
import torch
import torch.nn.functional as F

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from models.train_all import Corpus, REPORTS, WEIGHTS, reseed, tokenize  # noqa: E402
from models.vlm import N_VIS, M7VLM, count_params                        # noqa: E402

MAX_INSTR, MAX_ANS = 40, 50
torch.set_num_threads(4)


# --------------------------------------------------------------------------- #
# data
# --------------------------------------------------------------------------- #
class VLMData:
    """Instruction pairs plus cached frozen-tower features.

    Features are cached per *patch*, not per example: 985 patches back 8,962
    questions, so caching by example would store the same tensor nine times.
    """

    def __init__(self, C, m7):
        self.C = C
        self.vocab = list(C.vocab) + ["<sep>"]
        self.w2i = {w: i for i, w in enumerate(self.vocab)}
        self.BOS, self.EOS, self.SEP = 2, 3, len(self.vocab) - 1

