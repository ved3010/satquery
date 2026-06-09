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
        params = dict(spec.params_schema)
        with trace.timed(mid, model_id=mid, model_name=spec.name,
                         model_version=spec.version, params=params) as step:
            res = run_model(spec, state["query"], state.get("images", []), params)
            step.outcome = res.get("summary", "")
            step.confidence = res.get("confidence")
            if res.get("stub"):
                # Surfaced in the trace so a stubbed run is never mistaken for
                # a real inference in a screenshot or a report.
                step.params["STUB"] = "no trained weights"
        out[mid] = res

    return {"results": out}


def measure(state: State) -> dict[str, Any]:
    """Compute land-surface statistics from the pixels themselves.

    Deliberately a separate node from EXECUTE, and deliberately not a model.
    The percentages a user acts on -- vegetation, urbanisation, water -- come
    from published spectral indices over the real reflectance values, so they
    are reproducible from the same imagery by anyone with the same thresholds.
    Routing this through a network would make every figure a prediction, and a
    prediction is not something a district officer can audit.
    """
    from serve.analysis import analyse, headline

    trace: Trace = state["trace"]
    images = state.get("images", [])
    with trace.timed("measure", params={"method": "NDVI/MNDWI/NDBI"}) as step:
        a = analyse(images)
        trace.analysis = a
        step.params["available"] = a.get("available", False)
        step.outcome = ("; ".join(f"{h['label']} {h['value']}"
                                  for h in headline(a))
                        or a.get("reason", "not computable")[:90])
    return {}


def synthesise(state: State) -> dict[str, Any]:
    """M7 narrates the specialist outputs.

    M7 is given the specialist findings as text, not the raw image alone. That
    is what makes the answer evidence-grounded rather than hallucinated, and it
    is the core of the PS's novelty claim.
    """
    trace: Trace = state["trace"]
    results = state.get("results", {})
    spec = get("M7")

    with trace.timed("M7", model_id="M7", model_name=spec.name,
                     model_version=spec.version,
                     params=dict(spec.params_schema)) as step:
        from serve.analysis import dominant_class, headline
        findings = [f"{mid} ({get(mid).name}): {r.get('summary', '')}"
                    for mid, r in results.items()]
        measured = [f"{h['label'].lower()} {h['value']} ({h['note']})."
                    for h in headline(trace.analysis)]
        res = run_model(spec, state["query"], state.get("images", []),
                        dict(spec.params_schema), findings=findings,
                        measured=measured,
                        dominant=dominant_class(trace.analysis),
                        analysis=trace.analysis)
        step.outcome = "synthesised"
        if res.get("stub"):
            step.params["STUB"] = "no trained weights"

    confs = [r["confidence"] for r in results.values()
             if r.get("confidence") is not None]
    conf = min(confs) if confs else None      # weakest link, not average:
                                              # a chain is only as good as its
                                              # least confident step
    ans = res.get("answer") or res.get("summary") or ""
    trace.answer = ans
    trace.confidence = conf
    return {"answer": ans, "confidence": conf}


def evidence(state: State) -> dict[str, Any]:
    """Collect visual evidence and persist the trace to the Obsidian vault."""
    trace: Trace = state["trace"]
    ev: list[str] = []
    for r in state.get("results", {}).values():
        ev.extend(r.get("evidence", []))
    trace.evidence = ev
    with trace.timed("evidence", params={"artifacts": len(ev)}) as step:
        step.outcome = f"{len(ev)} overlay(s)"
    trace.write()
    trace.write_json()
    return {"evidence": ev}


def reject(state: State) -> dict[str, Any]:
    """Refuse with a stated reason and still write a trace.

    A refused run is an auditable outcome, not an error. PS 26167 asks for
    "input upload and compatibility checking"; correctly refusing an impossible
    request demonstrates that, where silently returning garbage does not.
    """
    trace: Trace = state["trace"]
    msg = state.get("rejected") or "incompatible input"
    with trace.timed("reject", params={"reason": msg[:60]}) as step:
        step.outcome = "refused"
    trace.answer = ""
    trace.write()
    trace.write_json()
    return {"answer": "", "confidence": None}


def _branch(state: State) -> str:
    return "reject" if state.get("rejected") else "route"


# --------------------------------------------------------------------------- #
# graph
# --------------------------------------------------------------------------- #
def build_graph(checkpointer=None):
    g = StateGraph(State)
    g.add_node("ingest", ingest)
    g.add_node("validate", validate)
    g.add_node("route", route_node)
    g.add_node("execute", execute)
    g.add_node("measure", measure)
    g.add_node("synthesise", synthesise)
    g.add_node("evidence", evidence)
    g.add_node("reject", reject)

    g.add_edge(START, "ingest")
    g.add_edge("ingest", "validate")
    g.add_conditional_edges("validate", _branch,
                            {"route": "route", "reject": "reject"})
    g.add_edge("route", "execute")
    g.add_edge("execute", "measure")
    g.add_edge("measure", "synthesise")
    g.add_edge("synthesise", "evidence")
    g.add_edge("evidence", END)
    g.add_edge("reject", END)

    return g.compile(checkpointer=checkpointer or MemorySaver())


_GRAPH = None


def get_graph():
    global _GRAPH
    if _GRAPH is None:
        _GRAPH = build_graph()
    return _GRAPH


def answer(query: str, images: list[dict[str, Any]],
           thread_id: str | None = None) -> Trace:
    """Run one query end-to-end and return its trace.

    The Trace carries the answer, confidence, evidence paths and the full
    step-by-step execution summary -- everything the API and the vault need.
    """
    trace = Trace(query=query)
    cfg = {"configurable": {"thread_id": thread_id or trace.run_id}}
    get_graph().invoke(
        {"query": query, "images": images, "trace": trace, "results": {}},
        config=cfg)
    return trace


if __name__ == "__main__":
    import glob

    # Run the demos on real fetched imagery when the AOI cache has any, and
    # fall back to placeholder paths otherwise. Four FileNotFoundError traces
    # demonstrate routing but not inference, and inference is the part that is
    # hard to be sure about by reading the code.
    aoi = os.path.join(ROOT_DIR, "data", "aoi_fetch")
    t2 = sorted(glob.glob(os.path.join(aoi, "*_s2t2.tif")))
    sar = sorted(glob.glob(os.path.join(aoi, "*_s1.tif")))
    a = (t2[-1] if t2 else "a.tif")
    b = (a.replace("_s2t2.tif", "_s2.tif") if t2 else "b.tif")
    s1 = sar[-1] if sar else b

    demos = [
        ("Describe the land-cover and major objects visible in this image.",
         [{"path": b, "modality": "optical", "date": "2024-03-15"}]),
        ("What changed between these two dates, and where did the change occur?",
         [{"path": a, "modality": "optical", "date": "2023-02-10"},
          {"path": b, "modality": "optical", "date": "2024-03-15"}]),
        ("Use the optical and SAR images together to identify built-up and "
         "water-covered regions.",
         [{"path": b, "modality": "optical"},
          {"path": s1, "modality": "sar"}]),
        ("What changed between these two dates?",
         [{"path": b, "modality": "optical"}]),      # must be refused
    ]
    for q, imgs in demos:
        t = answer(q, imgs)
        status = f"REJECTED: {t.rejected}" if t.rejected else t.answer
        print(f"\n{'='*74}\nQ: {q}\n   config={t.input_config} "
              f"task={t.task} models={t.models_invoked} {t.total_ms}ms\n"
              f"   {status}")
    print(f"\n{'='*74}\nvault notes written to satquery-core/vault/runs/")
