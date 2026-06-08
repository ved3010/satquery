"""
The agentic controller: a LangGraph state machine over the model registry.

    INGEST -> VALIDATE -> ROUTE -> EXECUTE -> SYNTHESISE -> EVIDENCE
                   |
                   +--> REJECT (incompatible input, with a stated reason)

LangGraph 1.2 checkpoints every state transition. That checkpoint stream *is*
the auditable execution summary PS 26167 requires, so we get the deliverable as
a by-product of the architecture rather than maintaining a separate log that can
drift out of sync with what actually ran.

Models are called through `agent.tools`, which returns stub results until the
real ONNX artefacts land in models/weights/. That is deliberate: the whole
system -- agent, API, dashboard -- can be built and demoed before a single model
finishes training on Kaggle. If training slips, the system still runs.
"""
from __future__ import annotations

import operator
import os
from typing import Annotated, Any, Optional, TypedDict, Union

from langgraph.graph import END, START, StateGraph
from langgraph.checkpoint.memory import MemorySaver

from agent import router as R
from agent.registry import Modality, Task, get
from agent.tools import run_model
from agent.trace import Trace

ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


class State(TypedDict, total=False):
    """Graph state.

    `results` is Annotated with a merge operator because the specialist nodes
    can run concurrently; without it, parallel writes to the same key raise
    InvalidUpdateError in LangGraph.
    """
    query: str
    images: list[dict[str, Any]]          # {path, modality, date, crs, ...}
    trace: Trace
    plan: Optional[R.Plan]
    results: Annotated[dict[str, Any], operator.or_]
    answer: str
    confidence: Optional[float]
    evidence: list[str]
    rejected: Optional[str]


# --------------------------------------------------------------------------- #
# nodes
# --------------------------------------------------------------------------- #
def ingest(state: State) -> dict[str, Any]:
    """Parse image metadata: modality, CRS, acquisition date, co-registration.

    Modality is read from metadata when present and inferred from band count
    otherwise (SAR products carry VV/VH; optical carries 3-13 bands).
    """
    trace: Trace = state["trace"]
    images = state.get("images", [])
    with trace.timed("ingest", params={"n_images": len(images)}) as step:
        mods, dates = [], []
        for img in images:
            m = img.get("modality")
            mods.append(Modality(m) if m else Modality.OPTICAL)
            dates.append(img.get("date"))
        cfg = R.classify_input(mods, [d for d in dates if d] or None)
        trace.input_config = cfg
        trace.n_images = len(images)
        step.params.update({
            "modalities": [m.value for m in mods],
            "dates": [d for d in dates if d] or "none",
        })
        step.outcome = cfg
    return {"images": [{**img, "modality": m.value} for img, m in zip(images, mods)]}


def validate(state: State) -> dict[str, Any]:
    """Compatibility checking. Routing happens here too, because the routing
    decision is what determines whether the input is compatible at all."""
    trace: Trace = state["trace"]
    images = state.get("images", [])
    mods = [Modality(i["modality"]) for i in images]
    dates = [i.get("date") for i in images]
    dates = [d for d in dates if d] or None

    with trace.timed("validate") as step:
        plan = R.route(state["query"], mods, dates)
        step.params.update({"input_config": plan.input_config,
                            "task": plan.task.value if plan.task else "none"})
        step.outcome = "rejected" if plan.rejected else "ok"

    trace.task = plan.task.value if plan.task else None
    if plan.rejected:
        trace.rejected = plan.rejected
        return {"plan": plan, "rejected": plan.rejected}
    return {"plan": plan, "rejected": None}


def route_node(state: State) -> dict[str, Any]:
    """Record the routing decision as its own observable step.

    The PS evaluates the trace, and 'which models were selected and why' is the
    single most informative line in it.
    """
    trace: Trace = state["trace"]
    plan: R.Plan = state["plan"]
    with trace.timed("route", params={
        "task": plan.task.value if plan.task else "none",
        "models": ",".join(plan.model_ids),
        "decided_by": "llm" if plan.used_llm else "rule-table",
    }) as step:
        step.outcome = plan.reason
    return {}


def execute(state: State) -> dict[str, Any]:
    """Run the selected specialists.

    Sequential today. The specialists are independent, so this becomes a
    fan-out once the real models are in -- `results` already merges with
    operator.or_ to make that a one-line change.
    """
    trace: Trace = state["trace"]
    plan: R.Plan = state["plan"]
    out: dict[str, Any] = {}

    for mid in plan.model_ids:
        spec = get(mid)
