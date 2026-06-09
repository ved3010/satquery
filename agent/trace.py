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
                seen.append(s.model_id)
        return seen

    # -- rendering -------------------------------------------------------- #
    def to_dict(self) -> dict[str, Any]:
        return {
            "run_id": self.run_id,
            "started": self.started,
            "query": self.query,
            "input_config": self.input_config,
            "n_images": self.n_images,
            "task": self.task,
            "models_invoked": self.models_invoked,
            "answer": self.answer,
            "confidence": self.confidence,
            "rejected": self.rejected,
            "evidence": self.evidence,
            "aoi": self.aoi,
            "analysis": self.analysis,
            "total_ms": self.total_ms,
            "steps": [asdict(s) for s in self.steps],
        }

    def to_markdown(self) -> str:
        fm = {
            "run_id": self.run_id,
            "started": self.started,
            "query": self.query,
            "input_config": self.input_config,
            "task": self.task or "n/a",
            "models_invoked": self.models_invoked,
            "confidence": round(self.confidence, 4) if self.confidence is not None else None,
            "latency_ms": self.total_ms,
            "rejected": self.rejected,
            "aoi": f"[[{self.aoi}]]" if self.aoi else None,
            "tags": ["satquery/run"],
        }
        out = ["---"]
        out += [f"{k}: {_yaml_scalar(v)}" for k, v in fm.items()]
        out += ["---", ""]

        title = self.task or ("rejected" if self.rejected else "run")
        out += [f"# Run `{self.run_id}` — {title}", ""]
        out += [f"> {self.query}", ""]

        if self.rejected:
            out += ["## Rejected", "",
                    f"**{self.rejected}**", "",
                    "The input configuration cannot answer this query. "
                    "Refusing is correct behaviour here — see "
                    "`Input upload and compatibility checking` in PS 26167.", ""]
        else:
            out += ["## Answer", "", self.answer or "_(no answer produced)_", ""]

        if self.analysis:
            from serve.analysis import to_markdown as _analysis_md
            out += _analysis_md(self.analysis)

        if self.evidence:
            out += ["## Visual evidence", ""]
            out += [f"![[{os.path.basename(p)}]]" for p in self.evidence]
            out += [""]

        out += ["## Execution trace", "",
                "| # | step | model | key parameters | ms | conf |",
                "|---|---|---|---|---:|---:|"]
        for i, s in enumerate(self.steps, 1):
            model = f"[[{s.model_id}-{s.model_name}]]" if s.model_id else "—"
            params = ", ".join(f"{k}={v}" for k, v in s.params.items()) or "—"
            conf = f"{s.confidence:.2f}" if s.confidence is not None else "—"
            note = f" ⚠️ {s.error}" if s.error else ""
            out.append(f"| {i} | {s.node}{note} | {model} | `{params}` | "
                       f"{s.latency_ms} | {conf} |")
        out += ["", f"**Total {self.total_ms} ms** across {len(self.steps)} steps.", ""]

        links = [f"[[{m}-{_model_name(m)}]]" for m in self.models_invoked]
        if self.aoi:
            links.append(f"[[{self.aoi}]]")
        if links:
            out += ["---", "", "Related: " + " · ".join(links), ""]
        return "\n".join(out)

    # -- persistence ------------------------------------------------------ #
    def write(self, vault: str = VAULT) -> str:
        """Write the run note into the vault. Returns the path.

        Never raises into the request path: a vault write failure must not
        fail a query that already produced a valid answer.
        """
        try:
            runs = os.path.join(vault, "runs")
            os.makedirs(runs, exist_ok=True)
            path = os.path.join(runs, f"{self.run_id}.md")
            with open(path, "w", encoding="utf-8") as fh:
                fh.write(self.to_markdown())
            return path
        except OSError as exc:                        # disk full, permissions...
            print(f"[trace] vault write failed ({exc}); trace still returned via API")
            return ""

    def write_json(self, vault: str = VAULT) -> str:
        try:
            d = os.path.join(vault, "runs")
            os.makedirs(d, exist_ok=True)
            path = os.path.join(d, f"{self.run_id}.json")
            with open(path, "w", encoding="utf-8") as fh:
                json.dump(self.to_dict(), fh, indent=2)
            return path
        except OSError:
            return ""


class _Timer:
    def __init__(self, trace: Trace, node: str, kw: dict[str, Any]):
        self.trace, self.node, self.kw = trace, node, kw

    def __enter__(self) -> Step:
        self._t = time.perf_counter()
        self.step = self.trace.step(self.node, **self.kw)
        return self.step

    def __exit__(self, exc_type, exc, tb) -> bool:
        self.step.latency_ms = int((time.perf_counter() - self._t) * 1000)
        if exc is not None:
            self.step.error = f"{exc_type.__name__}: {exc}"
        return False          # never swallow


def _new_run_id() -> str:
    return (datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
            + "-" + uuid.uuid4().hex[:4])


def _model_name(model_id: str) -> str:
    """Registry lookup for wikilink text, tolerant of an unknown id so a trace
    can still be rendered if the registry changed under it."""
    try:
        from agent.registry import REGISTRY
        spec = REGISTRY.get(model_id)
        return spec.name if spec else "unknown"
    except Exception:
        return "unknown"


# --------------------------------------------------------------------------- #
# vault scaffolding -- model + dataset notes, so the graph view has nodes to
# link to from day one
# --------------------------------------------------------------------------- #
def sync_model_notes(vault: str = VAULT) -> int:
    """Write one note per registered model. Idempotent -- safe to re-run, and
    should be re-run whenever the registry changes so metrics stay in sync."""
    from agent.registry import REGISTRY

    d = os.path.join(vault, "models")
    os.makedirs(d, exist_ok=True)
    for spec in REGISTRY.values():
        fm = {
            "model_id": spec.id,
            "name": spec.name,
            "version": spec.version,
            "runtime": spec.runtime,
            "n_images": spec.n_images,
            "trainable_on": spec.trainable_on,
            "trained": spec.is_trained,
            "tags": ["satquery/model"],
        }
        body = ["---"]
        body += [f"{k}: {_yaml_scalar(v)}" for k, v in fm.items()]
        body += ["---", "",
                 f"# {spec.id} — `{spec.name}`", "",
                 f"**Tasks.** {', '.join(t.value for t in spec.tasks)}",
                 f"**Modalities.** {', '.join(m.value for m in spec.modalities)}",
                 f"**Images required.** {spec.n_images}",
                 f"**Trainable params.** {spec.params_m}M" if spec.params_m else "",
                 f"**Training data.** [[{_slug(spec.train_data.split('(')[0].strip())}]]",
                 f"**Compute.** {spec.trainable_on}", ""]
        if spec.metrics:
            body += ["## Measured metrics", "",
                     "```json", json.dumps(spec.metrics, indent=2), "```", ""]
        else:
            body += ["## Measured metrics", "",
                     "_Not trained yet — no metrics. Never put a guessed number here._", ""]
        if spec.notes:
            body += ["## Notes", "", spec.notes, ""]
        path = os.path.join(d, f"{spec.id}-{spec.name}.md")
        with open(path, "w", encoding="utf-8") as fh:
            fh.write("\n".join(x for x in body if x is not None))
    return len(REGISTRY)


def sync_aoi_notes(vault: str = VAULT) -> int:
    """One note per IndiaSat region, so run notes link to a real AOI node.

    Without these the `[[AOI-...]]` links are unresolved: Obsidian still draws
    them in the graph, but they carry no content to hover or click through to.
    """
    try:
        from data.india import REGIONS
    except Exception:
        return 0

    d = os.path.join(vault, "aoi")
    os.makedirs(d, exist_ok=True)
    for r in REGIONS:
        fm = {"aoi": r.key, "name": r.name, "state": r.state,
              "latitude": r.lat, "longitude": r.lon,
              "climate_zone": r.climate_zone, "country": "India",
              "worldcover_tile": r.worldcover_tile,
              "tags": ["satquery/aoi"]}
        body = ["---"]
        body += [f"{k}: {_yaml_scalar(v)}" for k, v in fm.items()]
        body += ["---", "",
                 f"# {r.name}, {r.state}", "",
                 f"**Location.** {r.lat:.2f}N, {r.lon:.2f}E",
                 f"**Climate zone.** {r.climate_zone}",
                 f"**Landscape.** {r.landscape}",
                 f"**Best acquisition window.** {r.season}", "",
                 "This Köppen zone is **absent from BigEarthNet.txt**, which "
                 "covers only Cold and Temperate European regions. That gap is "
                 "why [[IndiaSat]] exists.", ""]
        with open(os.path.join(d, f"AOI-{r.name}.md"), "w", encoding="utf-8") as fh:
            fh.write("\n".join(body))
    return len(REGIONS)


if __name__ == "__main__":
    n = sync_model_notes()
    print(f"wrote {n} model notes to {os.path.join(VAULT, 'models')}")
    a = sync_aoi_notes()
    print(f"wrote {a} AOI notes to {os.path.join(VAULT, 'aoi')}")

    # demo trace so the vault has a run note to look at
    t = Trace(query="What changed between these two dates, and where?",
              input_config="bi-temporal-pair", n_images=2, task="change_vqa",
              aoi="AOI-Ahmedabad-23.02N-72.57E")
    t.step("ingest", params={"crs": "EPSG:32643", "coregistered": True}, outcome="ok")
    t.step("route", params={"intent": "change", "n_images": 2}, outcome="change_vqa")
    t.step("M5a", model_id="M5a", model_name="change_map", model_version="0.1.0",
           params={"threshold": 0.5, "tile": 256}, confidence=0.91, latency_ms=1180,
           outcome="1204 px changed")
    t.step("M5b", model_id="M5b", model_name="change_vqa", model_version="0.1.0",
           params={"top_k": 1}, confidence=0.83, latency_ms=240, outcome="increased")
    t.answer = ("Built-up area increased. 1,204 px (3.2% of the scene) changed, "
                "concentrated in the north-east quadrant.")
    t.confidence = 0.87
    print("wrote", t.write())
