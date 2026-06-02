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
            "presence":    {"acc": 0.9083, "n": 2955, "blind": 0.8934},
            "count":       {"acc": 0.6939, "n": 2947, "blind": 0.6023},
            "comp":        {"acc": 0.6952, "n": 4002, "blind": 0.7034},
            "rural_urban": {"acc": 0.7900, "n": 100,  "blind": 0.5600},
        },
    },
    params_schema={"count_bins": "rsvqa", "top_k": 1},
    notes="v1 shipped. KNOWN DEFECT: comp scores BELOW its own blind ablation "
          "(-0.8pt) because mean-pooled bag-of-words discards word order, so "
          "'more roads than forests' == 'more forests than roads'. v2 replaces "
          "the question encoder with a BiGRU and the backbone with M1.",
))

register(ModelSpec(
    id="M3", name="caption", version="1.0.0",
    tasks=(Task.CAPTION,),
    modalities=(Modality.OPTICAL, Modality.SAR),
    n_images=1,
    weights="m3_caption.pt", runtime="torch",
    trainable_on="kaggle-p100 ~2h",
    train_data="BigEarthNet.txt geographically-anchored captions",
    params_m=1.89,
    params_schema={"max_tokens": 64, "beam": 3},
    notes="Prefix-tuned: M1 embedding -> 10 soft prompt tokens -> small causal "
          "decoder. ~50ms on CPU vs ~4s for M7, and a working fallback if the "
          "VLM fails on demo day.",
))

register(ModelSpec(
    id="M4", name="ground", version="1.0.0",
    tasks=(Task.GROUNDING,),
    modalities=(Modality.OPTICAL, Modality.SAR),
    n_images=1,
    weights="m4_ground.pt", runtime="torch",
    trainable_on="kaggle-p100 ~3h",
    train_data="BigEarthNet.txt referring-expression + bbox annotations",
    params_m=1.67,
    params_schema={"score_thresh": 0.35, "max_boxes": 5},
    notes="M1 patch grid + text tower -> 2-layer cross-attention -> box head. "
          "L1 + generalised IoU loss. Answers 'highlight the water body'.",
))

register(ModelSpec(
    id="M5a", name="change_map", version="1.0.0",
    tasks=(Task.CHANGE_MAP,),
    modalities=(Modality.OPTICAL, Modality.SAR),
    n_images=2,
    weights="m5_change.pt", runtime="torch",
    trainable_on="kaggle-p100 ~2h (shared trunk with M5b)",
    train_data="LEVIR-CD (637 VHR bitemporal pairs, 1024x1024)",
    params_m=1.97,
    params_schema={"threshold": 0.5, "tile": 256},
    notes="Siamese M1 -> feature differencing -> light U-Net decoder -> binary "
          "mask. Produces the spatial evidence overlay.",
))

register(ModelSpec(
    id="M5b", name="change_vqa", version="1.0.0",
    tasks=(Task.CHANGE_VQA,),
    modalities=(Modality.OPTICAL, Modality.SAR),
    n_images=2,
    weights="m5_change.pt", runtime="torch",
    trainable_on="kaggle-p100 ~1h (shared trunk with M5a)",
    train_data="CDVQA (2,968 SECOND pairs, ~122k QA, 19 answer classes)",
    params_m=1.97,
    params_schema={"top_k": 1},
    notes="Shares M5a's siamese trunk; mask supervision improves the VQA head "
          "and it is one model to serve instead of two.",
))

register(ModelSpec(
    id="M6", name="fusion", version="1.0.0",
