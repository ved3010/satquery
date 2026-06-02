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
    tasks=(Task.FUSION,),
    modalities=(Modality.OPTICAL, Modality.SAR),
    n_images=2,
    weights="m6_fusion.pt", runtime="torch",
    trainable_on="kaggle-p100 ~3h",
    train_data="BigEarthNet v2 co-registered S1+S2, BEN-19 multilabel",
    params_m=2.48,
    params_schema={"threshold": 0.5, "return_per_sensor": True},
    notes="S2 (12-band) + S1 (VV/VH) branches -> cross-attention -> BEN-19 "
          "multilabel. Init from BIFOLD resnet50-s2 / resnet101-s1. "
          "MUST normalise per-sensor from metadata -- ISRO evaluates on "
          "Cartosat-2S + RISAT, not Sentinel. Never hardcode Sentinel stats.",
))

register(ModelSpec(
    id="M7", name="vlm", version="1.0.0",
    tasks=(Task.SYNTHESIS, Task.VQA, Task.CAPTION),
    modalities=(Modality.ANY,),
    n_images=1,
    weights="m7_vlm.pt", runtime="torch",
    trainable_on="cpu ~50min (frozen tower) / kaggle-p100 ~8-16h (2B version)",
    train_data="IndiaSat instruction mix -- 8,962 pairs over 985 patches "
               "(captioning, binary, MCQ, referring boxes)",
    params_m=2.34,
    params_schema={"temperature": 0.0, "max_tokens": 48},
    notes="Frozen M1 vision tower -> 17 visual prefix tokens -> 4-layer causal "
          "decoder (d=256, 2.34M trainable of 3.52M). CPU-trainable, which the "
          "2B Qwen3.5-VL+QLoRA plan is not on this hardware (bitsandbytes is "
          "CUDA-only) -- same architecture idea at a size that fits, so the "
          "tower swaps for the Kaggle ViT-B/32 without a redesign. "
          "Greedy decoding: an auditable trace needs the same imagery and "
          "question to give the same answer. It narrates; it never supplies a "
          "number. Every percentage in a report comes from serve/analysis.py, "
          "measured off the pixels."
))


# --------------------------------------------------------------------------- #
# measured metrics, read from the training reports
# --------------------------------------------------------------------------- #
# M2's numbers are literals above because they were measured by a different
# project (vqa/) against RSVQA-LR. Everything else is trained by
# models/train_all.py and models/train_vlm.py, which write their own reports --
# so the reports are read here rather than transcribed. A transcribed number
# drifts the moment a model is retrained, and a stale metric next to a fresh
# checkpoint is worse than no metric at all.
_REPORT_FILES = {
    "M1": "m1_rsclip_small.json", "M3": "m3_caption.json",
    "M4": "m4_ground.json", "M5a": "m5_change.json",
    "M5b": "m5_change.json", "M6": "m6_fusion.json",
    "M7": "m7_vlm.json",
}


def _attach_measured() -> None:
    import json
    d = os.path.join(ROOT, "models", "reports")
    for mid, fname in _REPORT_FILES.items():
        spec = REGISTRY.get(mid)
        if spec is None or spec.metrics:
            continue
        path = os.path.join(d, fname)
        if not os.path.exists(path):
            continue                     # not trained yet -- stays empty
        try:
            with open(path, encoding="utf-8") as fh:
                rep = json.load(fh)
        except (OSError, json.JSONDecodeError):
            continue
        # `metrics` is a mutable field on a frozen dataclass, so mutating the
        # dict is allowed where rebinding the attribute would not be.
        spec.metrics.update({"source": f"models/reports/{fname}", **rep})
        spec.metrics.pop("history", None)      # the loss curve is not a metric


_attach_measured()


# --------------------------------------------------------------------------- #
# queries over the registry
# --------------------------------------------------------------------------- #
def get(model_id: str) -> ModelSpec:
    if model_id not in REGISTRY:
        raise KeyError(f"unknown model id {model_id!r}; known: {sorted(REGISTRY)}")
    return REGISTRY[model_id]


def candidates(task: Task, n_images: int, modalities: list[Modality]) -> list[ModelSpec]:
    """Every registered model that can legally serve this request."""
    return [s for s in REGISTRY.values() if s.accepts(task, n_images, modalities)]


# Mandatory functional scope of PS 26167. M-3 is satisfied by either
# captioning or grounding; we implement both, so it is listed as a pair.
MANDATORY: dict[str, tuple[Task, ...]] = {
    "M-2 single-image VQA":      (Task.VQA,),
    "M-3 caption or grounding":  (Task.CAPTION, Task.GROUNDING),
    "M-4 change analysis":       (Task.CHANGE_VQA,),
    "M-5 optical-SAR fusion":    (Task.FUSION,),
}


def assert_mandatory_coverage() -> dict[str, list[str]]:
    """Which registered models cover each mandatory requirement.

    Raises if any requirement has no model at all. This is a structural check
    on the registry, not a claim that the models are trained -- use
    `ModelSpec.is_trained` for that.
    """
    coverage: dict[str, list[str]] = {}
    for req, tasks in MANDATORY.items():
        hit = [s.id for s in REGISTRY.values() if any(t in s.tasks for t in tasks)]
        if not hit:
            raise AssertionError(f"MANDATORY requirement uncovered: {req}")
        coverage[req] = hit
    return coverage


def status_table() -> str:
    rows = [("id", "name", "tasks", "imgs", "runtime", "params", "trained")]
    for s in REGISTRY.values():
        rows.append((
            s.id, s.name,
            ",".join(t.value for t in s.tasks)[:28],
            str(s.n_images), s.runtime,
            f"{s.params_m:.1f}M" if s.params_m else "-",
            "yes" if s.is_trained else "NO",
        ))
    w = [max(len(r[i]) for r in rows) for i in range(len(rows[0]))]
    out = []
    for i, r in enumerate(rows):
        out.append("  ".join(c.ljust(w[j]) for j, c in enumerate(r)))
        if i == 0:
            out.append("  ".join("-" * x for x in w))
    return "\n".join(out)


if __name__ == "__main__":
    print(status_table())
    print()
    print("Mandatory coverage (PS 26167):")
    for req, ids in assert_mandatory_coverage().items():
        print(f"  {req:<28} -> {', '.join(ids)}")
    trained = [s.id for s in REGISTRY.values() if s.is_trained]
    print(f"\n{len(trained)}/{len(REGISTRY)} artefacts present on disk: "
          f"{', '.join(trained) if trained else 'none yet'}")
