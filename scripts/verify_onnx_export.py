"""
Verify that an ONNX export of the M1 image tower is numerically faithful.

A silently-broken export is the worst failure mode in this project: the model
still loads, still returns a correctly-shaped unit-norm vector, and is complete
nonsense. The only real test is comparing ONNX output against PyTorch output on
the same input.

Also reports every file the exporter produced -- torch's dynamo exporter can
write weights to a sidecar .data file, so a small .onnx is not by itself
evidence of a broken export.

    python scripts/verify_onnx_export.py
"""
from __future__ import annotations

import glob
import os
import shutil
import sys
import tempfile

import numpy as np
import torch
import torch.nn as nn
import torch.nn.functional as F

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

IN_CH = 14


class ImageTower(nn.Module):
    def __init__(self, m):
        super().__init__()
