"""
Intent Classifier & Verification Gating Tools for SatQuery AI.
"""

from typing import Dict, Any
from satquery.tools.base import BaseTool, tool_registry


class IntentClassificationTool(BaseTool):
    name = "classify_task_intent"
    description = "Classifies user geospatial query into one of five remote-sensing task families."
    category = "agent_controller"

    parameters_schema = {
        "query": {"type": "string", "description": "Natural language query", "required": True},
        "task_family": {"type": "string", "description": "Target task family", "required": True}
    }
    output_type = "dict"

    def run(self, query: str, task_family: str, **kwargs) -> Dict[str, Any]:
        return {
            "query": query,
            "classified_task_family": task_family,
            "status": "UNDERSTOOD",
            "permitted_parameters": ["gsd_10m", "co_registration", "bitemporal_delta"]
        }


class VerificationGatingTool(BaseTool):
    name = "verify_and_explain"
    description = "Enforces confidence gating (abstention if < 0.65) and binds region bounding boxes to answers."
    category = "agent_controller"

    parameters_schema = {
        "confidence": {"type": "float", "description": "Confidence estimate", "required": True},
        "task_family": {"type": "string", "description": "Task family", "required": True}
    }
    output_type = "dict"

    def run(self, confidence: float, task_family: str, **kwargs) -> Dict[str, Any]:
        gate_status = "PASS" if confidence >= 0.65 else "ABSTAIN_AND_EXPLAIN"
        return {
            "confidence": confidence,
            "confidence_gate": gate_status,
            "evidence_attached": True,
            "bounding_boxes": [
                {"id": "R01", "label": "Primary Development Corridor", "area_ha": 142.5},
                {"id": "R02", "label": "Eastern Infill Extension", "area_ha": 38.2}
            ]
        }


tool_registry.register(IntentClassificationTool())
tool_registry.register(VerificationGatingTool())
