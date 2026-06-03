"""
Execution trace -> auditable summary -> Obsidian vault note.

PS 26167 requires:

    "provide an auditable execution summary containing the selected task,
     model/tool names, and key parameters"
    "The controller may perform internal task planning; however, only the
     observable execution trace ... will be evaluated."

So the trace is a product surface, not a log file. Every step a node takes is
recorded here with the registry id, version, resolved parameters, latency and
confidence, and the whole thing is rendered three ways:

    to_dict()      -> JSON for the dashboard
    to_markdown()  -> a note in the Obsidian vault (wikilinked, graph-viewable)
    (markdown also renders to PDF for the "downloadable reports" deliverable)

The vault is just a folder of .md files. Obsidian only ever READS it -- it is a
viewer, never a runtime dependency. If Obsidian is not installed, everything
still works; you only lose the graph view.
"""
from __future__ import annotations

import json
import os
import re
import time
import uuid
from dataclasses import dataclass, field, asdict
from datetime import datetime, timezone
from typing import Any

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
VAULT = os.path.join(ROOT, "vault")

# Characters Windows forbids in filenames, plus the ones Obsidian treats
# specially inside wikilinks ([ ] | #  ^).
_UNSAFE = re.compile(r'[<>:"/\\|?*\[\]#^\x00-\x1f]')


def _slug(text: str, maxlen: int = 60) -> str:
    """Filesystem- and wikilink-safe fragment."""
    s = _UNSAFE.sub("", text).strip().replace(" ", "-")
    s = re.sub(r"-{2,}", "-", s)
    return s[:maxlen].strip("-.") or "untitled"


def _yaml_scalar(v: Any) -> str:
    """Quote a scalar for YAML frontmatter. Frontmatter is parsed by Obsidian,
    so an unescaped quote or colon in a user query would corrupt the note."""
    if isinstance(v, bool):
        return "true" if v else "false"
    if isinstance(v, (int, float)) and not isinstance(v, bool):
        return str(v)
    if v is None:
        return "null"
    if isinstance(v, (list, tuple)):
        return "[" + ", ".join(_yaml_scalar(x) for x in v) + "]"
    s = str(v)
    return '"' + s.replace("\\", "\\\\").replace('"', '\\"').replace("\n", " ") + '"'


@dataclass
class Step:
    """One observable action. `model_id` is None for non-model steps
    (ingest, validate, route) -- those are still recorded, because the PS asks
    for the *selected task* and routing decision, not only model calls."""
    node: str
    model_id: str | None = None
    model_name: str | None = None
    model_version: str | None = None
    params: dict[str, Any] = field(default_factory=dict)
    outcome: str = ""
    confidence: float | None = None
    latency_ms: int = 0
    error: str | None = None

    @property
    def label(self) -> str:
        if self.model_id:
            return f"{self.model_id} {self.model_name}"
        return self.node


@dataclass
class Trace:
    query: str
    run_id: str = field(default_factory=lambda: _new_run_id())
    started: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    input_config: str = "unknown"      # single-optical | single-sar | cross-modal-pair | bi-temporal-pair
    n_images: int = 0
    task: str | None = None            # the classified task
    steps: list[Step] = field(default_factory=list)
    answer: str = ""
    confidence: float | None = None
    evidence: list[str] = field(default_factory=list)   # relative image paths
    aoi: str | None = None
    analysis: dict[str, Any] = field(default_factory=dict)   # measured stats
    rejected: str | None = None        # populated when VALIDATE refuses
    _t0: float = field(default_factory=time.perf_counter, repr=False)

    # -- recording -------------------------------------------------------- #
    def step(self, node: str, **kw: Any) -> Step:
        s = Step(node=node, **kw)
        self.steps.append(s)
        return s

    def timed(self, node: str, **kw: Any) -> "_Timer":
        """`with trace.timed("M2", model_id="M2") as s: ...` records latency
        even if the body raises, so failures appear in the trace too. A model
        that errored is exactly the thing an auditor wants to see."""
        return _Timer(self, node, kw)

    @property
    def total_ms(self) -> int:
        """Wall-clock elapsed, floored at the sum of recorded step latencies.

        For a live run wall-clock always wins. The floor only matters for a
        synthetic or replayed trace, where steps carry latencies that were not
        actually spent in this process -- reporting 0 ms next to a step table
        summing to 1.4 s would read as a bug.
        """
        wall = int((time.perf_counter() - self._t0) * 1000)
        return max(wall, sum(s.latency_ms for s in self.steps))

    @property
    def models_invoked(self) -> list[str]:
        seen: list[str] = []
        for s in self.steps:
            if s.model_id and s.model_id not in seen:
