"""
Declarative model registry for SatQuery AI (SIH PS 26167).

The router may ONLY select models from this registry, and the execution trace
records exactly which registry entry ran with which parameters. That is what
makes the trace auditable in the sense the problem statement requires:

    "provide an auditable execution summary containing the selected task,
     model/tool names, and key parameters"

Adding a model later is one ModelSpec, not a code change anywhere else.

Every spec carries its *published* metrics. Metrics that have not been measured
yet are None -- never a guess. `python -m agent.registry` prints the table so we
can always see at a glance what is real and what is still a stub.
"""
from __future__ import annotations

import os
from dataclasses import dataclass, field
from enum import Enum
from typing import Any

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
WEIGHTS_DIR = os.path.join(ROOT, "models", "weights")


class Modality(str, Enum):
    """Sensor type of a single input image."""
    OPTICAL = "optical"        # RGB / multispectral (Sentinel-2, Cartosat-2S)
    SAR = "sar"                # synthetic aperture radar (Sentinel-1, RISAT)
    ANY = "any"


class Task(str, Enum):
    """The task vocabulary the router classifies queries into.

    These map 1:1 onto the mandatory functional scope of PS 26167 so that
    coverage is checkable by inspection -- see `assert_mandatory_coverage()`.
    """
    VQA = "vqa"                        # M-2 mandatory
    CAPTION = "caption"                # M-3 (one of)
    GROUNDING = "grounding"            # M-3 (one of)
    CHANGE_MAP = "change_map"          # M-4 spatial evidence
    CHANGE_VQA = "change_vqa"          # M-4 mandatory
    FUSION = "fusion"                  # M-5 mandatory
    RETRIEVAL = "retrieval"            # supporting: embedding / zero-shot
    SYNTHESIS = "synthesis"            # narrating specialist outputs


@dataclass(frozen=True)
class ModelSpec:
    """One entry in the registry.

    n_images pins the input arity, which is what lets VALIDATE reject
    incompatible requests with a real reason instead of returning garbage
    (e.g. asking for change detection with a single image).
    """
    id: str                             # stable tag, e.g. "M5a"
    name: str                           # human name used in the trace
    version: str
    tasks: tuple[Task, ...]
    modalities: tuple[Modality, ...]
    n_images: int                       # exact number of images required
    weights: str | None                 # path relative to models/weights
    runtime: str                        # "onnx" | "llamacpp" | "stub"
    trainable_on: str                   # where it is trained
    train_data: str
    params_m: float | None              # trainable params, millions
    metrics: dict[str, Any] = field(default_factory=dict)
    params_schema: dict[str, Any] = field(default_factory=dict)
