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

