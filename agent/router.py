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
