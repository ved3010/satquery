"""
Export the registry and the measured training reports into the website.

    python scripts/export_site_data.py    ->  web/lib/models.json

The site never hand-types a metric. Every number it renders is read from
`models/reports/*.json`, which is written by the training scripts themselves,
so retraining a model and refreshing the page cannot disagree. A model with no
report shows as "not measured" rather than as a plausible-looking number.
"""
from __future__ import annotations

import json
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, ROOT)

from agent.registry import REGISTRY, assert_mandatory_coverage  # noqa: E402

REPORTS = os.path.join(ROOT, "models", "reports")
OUT = os.path.join(ROOT, "web", "lib", "models.json")


def _report(name: str) -> dict:
    p = os.path.join(REPORTS, name)
    if not os.path.exists(p):
        return {}
    with open(p, encoding="utf-8") as fh:
        return json.load(fh)


def _pct(x) -> str | None:
    return None if x is None else f"{x * 100:.1f}%"


def headline_metrics() -> list[dict]:
    """One measured headline per model, each next to its baseline.

    A metric without a baseline cannot answer "is the model using the image at
    all?", so the pair travels together everywhere -- report, vault note, and
    this page.
    """
    m1, m3, m4 = _report("m1_rsclip_small.json"), _report("m3_caption.json"), \
        _report("m4_ground.json")
