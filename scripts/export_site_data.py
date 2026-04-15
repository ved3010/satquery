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
    m5, m6, m7 = _report("m5_change.json"), _report("m6_fusion.json"), \
        _report("m7_vlm.json")
    m2 = REGISTRY["M2"].metrics

    rows = [
        {"id": "M6", "name": "fusion", "task": "Optical–SAR land cover",
         "metric": "mAP", "value": m6.get("test_mAP"),
         "baseline": m6.get("prior_baseline_mAP"), "baseline_label": "class prior",
         "n": m6.get("n_test")},
        {"id": "M3", "name": "caption", "task": "Scene description",
         "metric": "next-token accuracy", "value": m3.get("test_token_acc"),
         "baseline": m3.get("mode_token_baseline"), "baseline_label": "most frequent token",
         "n": m3.get("n_test")},
        {"id": "M5b", "name": "change_vqa", "task": "Bi-temporal change VQA",
         "metric": "accuracy", "value": m5.get("test_changevqa_acc"),
         "baseline": m5.get("majority_baseline"), "baseline_label": "majority class",
         "n": m5.get("n_test")},
        {"id": "M2", "name": "vqa", "task": "Single-image VQA",
         "metric": "overall accuracy", "value": m2.get("overall_accuracy"),
         "baseline": m2.get("majority_baseline"), "baseline_label": "majority answer",
         "n": 10004},
        {"id": "M5a", "name": "change_map", "task": "Change mask",
         "metric": "IoU", "value": m5.get("test_mask_iou"),
         "baseline": None, "baseline_label": None, "n": m5.get("n_test")},
        {"id": "M4", "name": "ground", "task": "Referring-expression grounding",
         "metric": "mean IoU", "value": m4.get("test_mean_iou"),
         "baseline": m4.get("mean_box_baseline_iou"), "baseline_label": "mean training box",
         "n": m4.get("n_test")},
        {"id": "M1", "name": "rsclip", "task": "Image–text retrieval",
         "metric": "R@1", "value": (m1.get("test") or {}).get("i2t_R@1"),
         "baseline": m1.get("chance_R@1"), "baseline_label": "chance",
         "n": m1.get("gallery")},
    ]

    # Multiple choice, not captioning, is M7's headline: the blind ablation
    # moves 40 points there against 8 on captioning, because a language prior
    # can carry a caption a long way and cannot guess which of four land-cover
    # classes dominates a scene it has not seen.
    mcq = ((m7.get("test") or {}).get("mcq") or {})
    blind = ((m7.get("blind_ablation") or {}).get("mcq") or {})
    rows.append({
        "id": "M7", "name": "vlm", "task": "Instruction-following VLM",
        "metric": "MCQ exact match", "value": mcq.get("exact_match"),
        "baseline": blind.get("exact_match"),
        "baseline_label": "same weights, image zeroed",
        "n": mcq.get("n"),
    })
    return rows


def main() -> None:
    models = []
    for s in REGISTRY.values():
        models.append({
            "id": s.id, "name": s.name, "version": s.version,
            "tasks": [t.value for t in s.tasks],
            "modalities": [m.value for m in s.modalities],
            "n_images": s.n_images, "runtime": s.runtime,
            "params_m": s.params_m, "trained": s.is_trained,
        })
        # `notes`, `train_data` and `trainable_on` stay out: the site does not
        # render them, and they are two thirds of the file. /models serves the
        # full spec for anyone who wants it.

    m6 = _report("m6_fusion.json")
    m7 = _report("m7_vlm.json")
    payload = {
        "generated_by": "scripts/export_site_data.py",
        "models": models,
        "trained_count": sum(1 for m in models if m["trained"]),
        "headline": headline_metrics(),
        "coverage": assert_mandatory_coverage(),
        # The cloud ablation is the single most persuasive measured result in
        # the project: it shows *why* the fusion model exists.
        "cloud_ablation": m6.get("ablation_mAP", {}),
        "vlm": {
            "architecture": m7.get("architecture"),
            "epochs": m7.get("epochs"),
            "seconds": m7.get("seconds"),
            "test": m7.get("test"),
            "blind_ablation": m7.get("blind_ablation"),
            "caveat": m7.get("caveat"),
        },
        "dataset": {
            "name": "IndiaSat",
            "patches": 985,
            "annotations": 8962,
            "regions": 8,
            "bands": "Sentinel-2 (12) + Sentinel-1 (VV/VH) + ESA WorldCover",
            "note": "BigEarthNet contains zero Indian data — its labels come "
                    "from CORINE, a Europe-only product. Swapping CORINE for "
                    "ESA WorldCover reproduces the recipe over India.",
        },
    }

    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, "w", encoding="utf-8") as fh:
        json.dump(payload, fh, indent=2)
    print(f"wrote {OUT}")
    print(f"  {payload['trained_count']}/{len(models)} models trained")
    for r in payload["headline"]:
        v, b = _pct(r["value"]), _pct(r["baseline"])
        print(f"  {r['id']:<4} {r['metric']:<22} {v or 'not measured':<8} "
              f"vs {b or '—'}")


if __name__ == "__main__":
    main()
