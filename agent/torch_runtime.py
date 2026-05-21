"""
PyTorch runtime for the specialists trained on IndiaSat.

The Kaggle path exports ONNX; these CPU-trained models are served straight from
their `.pt` state dicts. Keeping this in its own module means `tools.py` stays a
thin dispatcher and torch is imported only when a torch-backed model is actually
called -- the API starts fast even though torch takes seconds to import.
"""
from __future__ import annotations

import os
import re
from typing import Any

WORLDCOVER_NAMES = ["tree cover", "shrubland", "grassland", "cropland",
                    "built-up", "bare or sparse vegetation", "snow and ice",
                    "permanent water bodies", "herbaceous wetland",
                    "mangroves", "moss and lichen"]
CHANGE_NAMES = ["increased", "decreased", "unchanged"]

_MODELS: dict[str, Any] = {}
_NORM: dict[str, Any] | None = None


def _norm() -> dict[str, Any]:
    """Training-split normalisation statistics.

    Inference must reuse exactly the numbers the models were fitted with.
    Recomputing them from whatever image a user happens to supply would shift
    the input distribution and quietly degrade every prediction -- a failure
    with no error message, which is the worst kind.
    """
    global _NORM
    if _NORM is None:
        import numpy as np
        from agent.registry import WEIGHTS_DIR
        p = os.path.join(WEIGHTS_DIR, "indiasat_norm.npz")
        if not os.path.exists(p):
            raise FileNotFoundError(
                "models/weights/indiasat_norm.npz missing — "
                "run scripts/export_norm.py")
        z = np.load(p, allow_pickle=True)
        _NORM = {"m2": z["mean_s2"], "s2": z["std_s2"],
                 "m1": z["mean_s1"], "s1": z["std_s1"],
                 "vocab": [str(v) for v in z["vocab"]]}
    return _NORM


def stack_for(path: str):
    """Normalised (S2 12-band, S1 2-band) at 120x120, plus a `degraded` flag.

    AOI fetches write `<stem>.tif` (8-bit RGB, for display) beside `<stem>.npz`
    (the real band cube). The agent is handed the .tif, so the sidecar is how a
    model reaches the bands it was trained on. With no sidecar — a plain user
    upload — RGB is mapped into the blue/green/red slots and the remaining nine
    bands are held at the dataset mean. That is a degraded input, and the flag
    makes sure the answer says so rather than pretending otherwise.
    """
    import numpy as np
    from PIL import Image

    n = _norm()
    npz = path.rsplit(".", 1)[0] + ".npz"
    s2 = s1 = None
    if os.path.exists(npz):
        z = np.load(npz)
        s2 = z["s2"].astype(np.float32) if "s2" in z else None
        s1 = z["s1"].astype(np.float32) if "s1" in z else None

    def resize(a, c):
        out = np.zeros((c, 120, 120), np.float32)
        for i in range(min(c, a.shape[0])):
            out[i] = np.asarray(
                Image.fromarray(a[i]).resize((120, 120), Image.BILINEAR))
        return out

    degraded = s2 is None
    if degraded:
        im = Image.open(path).convert("RGB").resize((120, 120), Image.BILINEAR)
        rgb = np.asarray(im, np.float32).transpose(2, 0, 1)          # R, G, B
        s2 = np.tile(n["m2"][:, None, None], (1, 120, 120)).astype(np.float32)
        s2[1] = rgb[2] / 255.0 * 3000        # blue
        s2[2] = rgb[1] / 255.0 * 3000        # green
        s2[3] = rgb[0] / 255.0 * 3000        # red
    else:
        s2 = resize(s2, 12)

    s1 = (resize(s1, 2) if s1 is not None
          else np.tile(n["m1"][:, None, None], (1, 120, 120)).astype(np.float32))

    s2n = (s2 - n["m2"][:, None, None]) / n["s2"][:, None, None]
    s1n = (s1 - n["m1"][:, None, None]) / n["s1"][:, None, None]
    return s2n, s1n, degraded


def _model(spec):
    import torch
    if spec.id not in _MODELS:
        from models.backbone import (M1Clip, M3Caption, M4Ground, M5Change,
