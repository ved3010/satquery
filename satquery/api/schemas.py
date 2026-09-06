"""
Pydantic Schemas for SatQuery API.
"""

from typing import Dict, Any, List, Optional
from pydantic import BaseModel, Field


class QueryRequest(BaseModel):
    query: str = Field(..., description="Natural language geospatial question", json_schema_extra={"example": "What changed in Western Ghats between 2020 and 2025?"})
    aoi: Optional[str] = Field(None, description="Optional preset AOI key or region name")
    year_t1: Optional[int] = Field(None, description="Baseline year")
    year_t2: Optional[int] = Field(None, description="Target year")


class ExecutionStepSchema(BaseModel):
    step_id: str
    tool: str
    description: str
    status: str
    runtime_ms: float
    output: Dict[str, Any]
    preview_image: Optional[str] = None


class QueryResponse(BaseModel):
    job_id: str
    query: str
    intent: str
    temporal_range: Dict[str, int]
    primary_metric: str
    sensor: str
    synthesized_report: Dict[str, Any]
    metrics: Dict[str, Any]
    audit_record: Dict[str, Any]
    execution_trace: List[ExecutionStepSchema]
    map_layers: Dict[str, Any]
    total_latency_ms: float
