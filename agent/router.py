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
