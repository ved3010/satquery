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
