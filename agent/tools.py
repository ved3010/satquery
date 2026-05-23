"""
Thin wrappers that let the graph call a model without knowing its runtime.

One rule governs this file: **a stub must never be mistakable for a real
inference.** Every stubbed result carries `stub=True`, the graph stamps STUB
into the trace, and the answer text says so. Screenshots taken during
development must not be able to masquerade as measured results in a report.

Real inference is wired per-runtime as artefacts land in models/weights/:
  onnx      -> onnxruntime CPU session (M1-M6)
  llamacpp  -> llama-server HTTP on 127.0.0.1:8080 (M7)
"""
from __future__ import annotations

import os
from typing import Any

from agent.registry import ModelSpec, Task

LLAMA_SERVER = os.environ.get("SATQUERY_LLAMA_URL", "http://127.0.0.1:8080")

# Warm ONNX sessions, created lazily and reused: session construction costs
# ~100ms and would otherwise dominate per-query latency.
_SESSIONS: dict[str, Any] = {}


def _session(spec: ModelSpec):
    if spec.id not in _SESSIONS:
        import onnxruntime as ort
        so = ort.SessionOptions()
        so.intra_op_num_threads = 4          # 4 physical cores on this machine
        _SESSIONS[spec.id] = ort.InferenceSession(
            spec.weights_path, so, providers=["CPUExecutionProvider"])
    return _SESSIONS[spec.id]


def _stub(spec: ModelSpec, note: str = "") -> dict[str, Any]:
    reason = note or f"{spec.id} has no trained weights at {spec.weights}"
    msg = f"[STUB — {reason}]"
    return {
        "stub": True,
        "answer": msg,
        "summary": msg,
        "confidence": None,
        "evidence": [],
    }


# --------------------------------------------------------------------------- #
def run_model(spec: ModelSpec, query: str, images: list[dict[str, Any]],
              params: dict[str, Any], **kw: Any) -> dict[str, Any]:
    """Dispatch to the right runtime. Returns a dict with at least
    `summary`, `confidence`, `evidence`, `stub`."""
    if spec.runtime == "llamacpp":
        return _run_vlm(spec, query, images, params, **kw)
    if spec.runtime == "torch":
        try:
            from agent.torch_runtime import run as run_torch
            return run_torch(spec, query, images, params, **kw)
        except Exception as exc:
            err_msg = f"[ERROR {type(exc).__name__}: {exc}]"
            return {"stub": True,
                    "answer": err_msg,
                    "summary": err_msg,
                    "confidence": None, "evidence": []}
    if not spec.is_trained:
        if spec.id == "M2":
            return _run_m2_multispectral_vqa(spec, query, images, params)
        return _stub(spec)
    try:
        return _run_onnx(spec, query, images, params)
    except Exception as exc:
        if spec.id == "M2":
            return _run_m2_multispectral_vqa(spec, query, images, params)
        err_msg = f"[ERROR {type(exc).__name__}: {exc}]"
        return {"stub": True, "answer": err_msg, "summary": err_msg,
                "confidence": None, "evidence": []}


def _run_onnx(spec: ModelSpec, query: str, images: list[dict[str, Any]],
              params: dict[str, Any]) -> dict[str, Any]:
    if spec.id == "M2":
        return _run_m2_vqa(spec, query, images, params)
    # M1, M3, M4, M5a, M5b, M6 land here as each is trained and exported.
    return _stub(spec, f"{spec.id} weights present but no adapter implemented yet")


def _run_m2_vqa(spec: ModelSpec, query: str, images: list[dict[str, Any]],
                params: dict[str, Any]) -> dict[str, Any]:
    """Single-image VQA — the one model that is actually trained today.

    Preprocessing constants (mean, std, image_size, max_qlen) are read from the
