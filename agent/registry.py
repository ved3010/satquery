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
    notes: str = ""

    @property
    def weights_path(self) -> str | None:
        return os.path.join(WEIGHTS_DIR, self.weights) if self.weights else None

    @property
    def is_trained(self) -> bool:
        """True only when the artefact actually exists on disk."""
        p = self.weights_path
        return bool(p) and os.path.exists(p)

    def accepts(self, task: Task, n_images: int, modalities: list[Modality]) -> bool:
        if task not in self.tasks:
            return False
        if n_images != self.n_images:
            return False
        if Modality.ANY in self.modalities:
            return True
        return all(m in self.modalities or m is Modality.ANY for m in modalities)


# --------------------------------------------------------------------------- #
# The seven models
# --------------------------------------------------------------------------- #
# M2 is the only entry with real measured metrics today: they come from the
# held-out RSVQA-LR test split reported in vqa/RESULTS.md. Everything else is
# awaiting training on Kaggle -- metrics stay empty until measured.

REGISTRY: dict[str, ModelSpec] = {}


def register(spec: ModelSpec) -> ModelSpec:
    if spec.id in REGISTRY:
        raise ValueError(f"duplicate model id: {spec.id}")
    REGISTRY[spec.id] = spec
    return spec


register(ModelSpec(
    id="M1", name="rsclip", version="1.0.0",
    tasks=(Task.RETRIEVAL,),
    modalities=(Modality.OPTICAL, Modality.SAR),
    n_images=1,
    weights="m1_rsclip_small.pt", runtime="torch",
    trainable_on="kaggle-p100 ~4h",
    train_data="BigEarthNet.txt captions x reBEN patches (80k subset)",
    params_m=1.57,
    params_schema={"normalize": True},
    notes="Domain-adaptation core. ViT-B/32 with patch-embed inflated 3->14 "
          "channels (12 S2 bands + VV/VH). Its frozen image tower is the "
          "backbone of M2, M3, M4 and M6 -- train first.",
))

register(ModelSpec(
    id="M2", name="vqa", version="1.0.0",
    tasks=(Task.VQA,),
    modalities=(Modality.OPTICAL,),
    n_images=1,
    weights="m2_vqa.onnx", runtime="onnx",
    trainable_on="cpu 6.5min (v1) / kaggle-p100 ~40min (v2)",
    train_data="RSVQA-LR (57,223 active train QA pairs, disjoint image splits)",
    params_m=2.5,
    # Measured on the held-out RSVQA-LR test split, 10,004 QA pairs.
    # Source: vqa/RESULTS.md. Baselines included deliberately -- a bare
    # accuracy with no baseline cannot answer "is the image used at all?".
    metrics={
        "split": "RSVQA-LR test (10,004 QA pairs, 100 unseen tiles)",
        "overall_accuracy": 0.7587,
        "average_accuracy": 0.7718,
        "majority_baseline": 0.5749,
        "blind_baseline": 0.7283,
        "per_type": {
