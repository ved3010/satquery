"""
Hybrid task router: deterministic rules first, LLM only for genuine ambiguity.

Why hybrid rather than "let the LLM decide":

  * Pure-LLM routing is non-deterministic. It will eventually pick the wrong
    tool in front of a judge, and you cannot explain why.
  * Pure-rule routing cannot handle open natural language, which the PS
    explicitly requires ("non-expert users ... simple natural-language queries").

So: input arity and modality are HARD constraints resolved by table (2 images +
change intent -> M5, always). Only the intent classification falls back to the
VLM, and only when the lexical signal is weak. Every decision -- including which
branch fired -- is recorded in the trace, so "how do you know it picked the right
model?" has a concrete answer.
"""
from __future__ import annotations

import re
from dataclasses import dataclass

from agent.registry import Modality, Task, REGISTRY, candidates


# Plain constants rather than an Enum: these strings go straight into the trace
# and the API payload, and a bare str keeps JSON serialisation trivial.
SINGLE_OPTICAL = "single-optical"
SINGLE_SAR = "single-sar"
CROSS_MODAL_PAIR = "cross-modal-pair"      # co-registered optical + SAR
BI_TEMPORAL_PAIR = "bi-temporal-pair"      # same sensor, two dates
UNKNOWN = "unknown"


def classify_input(modalities: list[Modality], dates: list[str] | None = None) -> str:
    """Determine the input configuration from modality and acquisition dates.

    The optical+SAR vs bi-temporal distinction is the crux of the PS, and it
    cannot be made from modality alone: two Sentinel-2 scenes are bi-temporal,
    one S2 + one S1 is cross-modal. Dates disambiguate the same-modality case.
    """
    n = len(modalities)
    if n == 0:
        return UNKNOWN
    if n == 1:
        return SINGLE_SAR if modalities[0] is Modality.SAR else SINGLE_OPTICAL
    if n == 2:
        a, b = modalities
        if a is not b:
            return CROSS_MODAL_PAIR          # one optical, one SAR
        if dates and len(dates) == 2 and dates[0] != dates[1]:
            return BI_TEMPORAL_PAIR
        # Same sensor, same date (or no dates): treat as bi-temporal, which is
        # the only thing two same-modality images can usefully mean here.
        return BI_TEMPORAL_PAIR
    return UNKNOWN


# --------------------------------------------------------------------------- #
# lexical intent rules
# --------------------------------------------------------------------------- #
# Ordered: the FIRST pattern that matches wins, so more specific intents are
# listed before more general ones. `change` must precede `vqa`, because
# "has the built-up area increased?" is a question AND a change query.
_RULES: list[tuple[Task, re.Pattern[str]]] = [
    # Stems take \w* rather than a trailing \b: "increased" must match `increas`,
    # and a trailing \b cannot, because 'e' follows. "unchanged" needs the
    # optional (un) prefix for the same reason -- there is no word boundary
    # before "chang" inside it. Both appear in the PS representative query
    # "Has the built-up area increased, decreased, or remained unchanged?"
    (Task.CHANGE_VQA, re.compile(
        r"\b(un)?chang\w*"
        r"|\b(differ|increas|decreas|expand|declin|grow|grew|shrink|shrank|shrunk)\w*"
        r"|\bbefore and after\b|\bbetween these (two )?dates\b"
        r"|\bover time\b|\bsince\b", re.I)),
    (Task.GROUNDING, re.compile(
        r"\b(highlight|locate|where is|point out|show me the|mark the|"
        r"outline|bounding box|find the)\b", re.I)),
    (Task.FUSION, re.compile(
        r"\b(optical and sar|sar and optical|both (images|modalities|sensors)|"
        r"combin\w+|fuse|together|cross[- ]modal|radar and)\b", re.I)),
    (Task.CAPTION, re.compile(
        r"\b(describe|caption|summar\w+|what (do you |can you )?see|"
        r"overview|tell me about)\b", re.I)),
    (Task.VQA, re.compile(
        r"^(is|are|does|do|how many|what|which|can|has|have|was|were)\b|\?", re.I)),
]


@dataclass
class Plan:
    """The routing decision. `rejected` set means VALIDATE must refuse."""
    task: Task | None
    input_config: str
    model_ids: list[str]
    reason: str
    used_llm: bool = False
    rejected: str | None = None


def _lexical_intent(query: str) -> tuple[Task | None, str]:
    for task, pat in _RULES:
        m = pat.search(query)
        if m:
            return task, f"matched /{pat.pattern[:34]}.../ on {m.group(0)!r}"
    return None, "no lexical rule matched"


# Which tasks are legal for a given input configuration. This is the hard
# constraint table -- it is what lets the system refuse correctly instead of
# returning garbage, which PS 26167 asks for under "compatibility checking".
_LEGAL: dict[str, set[Task]] = {
    SINGLE_OPTICAL:   {Task.VQA, Task.CAPTION, Task.GROUNDING},
    SINGLE_SAR:       {Task.VQA, Task.CAPTION, Task.GROUNDING},
    CROSS_MODAL_PAIR: {Task.FUSION, Task.VQA, Task.CAPTION, Task.GROUNDING},
    BI_TEMPORAL_PAIR: {Task.CHANGE_VQA, Task.CHANGE_MAP},
}

_WHY_ILLEGAL = {
    (SINGLE_OPTICAL, Task.CHANGE_VQA):
        "Change analysis needs two images acquired at different times; one was supplied.",
    (SINGLE_SAR, Task.CHANGE_VQA):
        "Change analysis needs two images acquired at different times; one was supplied.",
    (SINGLE_OPTICAL, Task.FUSION):
        "Optical-SAR analysis needs a co-registered optical AND SAR pair; one optical image was supplied.",
    (SINGLE_SAR, Task.FUSION):
        "Optical-SAR analysis needs a co-registered optical AND SAR pair; one SAR image was supplied.",
    (BI_TEMPORAL_PAIR, Task.FUSION):
        "Both images are the same modality, so there is no optical-SAR pair to fuse.",
    (CROSS_MODAL_PAIR, Task.CHANGE_VQA):
        "The two images are different sensors, not two dates, so change over time cannot be measured.",
}


def route(query: str,
          modalities: list[Modality],
          dates: list[str] | None = None,
          llm_intent=None) -> Plan:
    """Classify the query and select models from the registry.

    `llm_intent` is an optional callable(query) -> Task|None used only when the
    lexical rules are silent. Passing None keeps routing fully deterministic,
    which is the right setting for reproducing benchmark numbers.
    """
    cfg = classify_input(modalities, dates)
    if cfg == UNKNOWN:
        return Plan(None, cfg, [], "no usable images",
                    rejected="Supply one or two images; got "
                             f"{len(modalities)}.")

    task, reason = _lexical_intent(query)
    used_llm = False
    if task is None and llm_intent is not None:
        task = llm_intent(query)
        used_llm = True
        reason = f"lexical rules silent; VLM classified as {task}"

    if task is None:
        # Sensible default per configuration rather than a hard failure: a bare
        # "tell me about this" on a pair should still do something useful.
        task = (Task.CHANGE_VQA if cfg == BI_TEMPORAL_PAIR else
                Task.FUSION if cfg == CROSS_MODAL_PAIR else Task.CAPTION)
        reason = f"no intent detected; defaulted to {task.value} for {cfg}"

    legal = _LEGAL.get(cfg, set())
    if task not in legal:
        why = _WHY_ILLEGAL.get((cfg, task))
        if why is None:
            why = (f"{task.value} is not supported for input configuration "
