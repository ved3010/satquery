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
