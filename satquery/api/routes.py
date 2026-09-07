"""
FastAPI Routes for SatQuery Agent and Geospatial Analytics.
"""

import uuid
import json
import asyncio
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from satquery.api.schemas import QueryRequest, QueryResponse
from satquery.agent.planner import AgentPlanner
from satquery.agent.executor import AgentExecutor
from satquery.agent.synthesizer import EvidenceSynthesizer
from satquery.agent.audit import AuditLedger
from satquery.agent.chat_agent import chat_agent
from satquery.tools.base import tool_registry
from satquery.tools.stac_discovery import PRESET_AOIS
from pydantic import BaseModel

router = APIRouter(prefix="/api")

planner = AgentPlanner()
executor = AgentExecutor()
synthesizer = EvidenceSynthesizer()
audit_ledger = AuditLedger()


class ChatRequest(BaseModel):
    message: str


@router.post("/chat")
def chat_endpoint(req: ChatRequest):
    """Conversational ChatGPT-style endpoint for answering EO doubts and on-demand satellite analysis."""
    return chat_agent.process_message(req.message)



@router.get("/examples")
def get_example_scenarios():
    """Returns curated preset queries across India and globally."""
    return {
        "presets": [
            {
                "id": "western_ghats",
                "title": "Western Ghats Rainforest Deforestation (2020 vs 2025)",
                "location": "Karnataka / Maharashtra, India",
                "query": "Assess forest loss and vegetation canopy change in Western Ghats between 2020 and 2025.",
                "domain": "Deforestation & Forest Canopy",
                "sensor": "Sentinel-2 MSI (10m)",
                "metric": "NDVI"
            },
            {
                "id": "osman_sagar",
                "title": "Osman Sagar Lake Water Depletion (2021 vs 2024)",
                "location": "Hyderabad, Telangana, India",
                "query": "Calculate surface water reduction in Osman Sagar Reservoir between 2021 and 2024.",
                "domain": "Water Bodies & Drought",
                "sensor": "Sentinel-2 MSI (10m)",
                "metric": "NDWI"
            },
            {
                "id": "bangalore_urban",
                "title": "Bangalore Tech Corridor Urban Sprawl (2020 vs 2025)",
                "location": "Bangalore, Karnataka, India",
                "query": "What is the concrete built-up and urban expansion in Bangalore over the last 5 years?",
                "domain": "Urban Built-up & Sprawl",
                "sensor": "Sentinel-2 MSI (10m)",
                "metric": "NDBI"
            },
            {
                "id": "assam_flood_sar",
                "title": "Assam Brahmaputra Monsoon Flood SAR (All-Weather)",
                "location": "Assam Plains, India",
                "query": "Map flood inundation along the Brahmaputra River through monsoon cloud cover using Sentinel-1 SAR.",
                "domain": "Monsoon Floods & SAR Radar",
                "sensor": "Sentinel-1 SAR C-Band (10m)",
                "metric": "SAR_VV"
            },
            {
                "id": "punjab_stubble_burn",
                "title": "Punjab Post-Harvest Stubble Burning & Fire Scars",
                "location": "Punjab, India",
                "query": "Assess agricultural stubble fire burn severity and fire scar extent in Punjab using NBR.",
                "domain": "Crop Fire & Burn Scars",
                "sensor": "Sentinel-2 MSI (20m)",
                "metric": "NBR"
            },
            {
                "id": "amazon_rainforest",
                "title": "Amazon Basin Deforestation & Logging Scars",
                "location": "Rondônia, Brazil",
                "query": "What changed in this Amazon sector between 2020 and 2025?",
                "domain": "Rainforest Logging",
                "sensor": "Sentinel-2 MSI (10m)",
                "metric": "NDVI"
            }
        ]
    }


@router.get("/tools")
def list_registered_tools():
    """Lists all registered Remote Sensing and Agentic tools."""
    return {"tools": tool_registry.list_tools()}


@router.post("/query", response_model=QueryResponse)
def execute_query(req: QueryRequest):
    """Executes the complete Agentic Geospatial Workflow."""
    job_id = f"job-{uuid.uuid4().hex[:8]}"
    
    # 1. Plan DAG
    plan = planner.plan(
        query=req.query,
        aoi_override=req.aoi,
        year_t1=req.year_t1,
        year_t2=req.year_t2
    )

    # 2. Execute DAG
    exec_result = executor.execute(plan)

    # 3. Grounded Synthesis
    synth = synthesizer.synthesize(plan, exec_result)

    # 4. Audit Trace
    audit = audit_ledger.create_audit_record(
        query=req.query,
        plan=plan.model_dump(),
        execution_trace=exec_result["execution_trace"],
        zonal_stats=exec_result["zonal_summary"]
    )

    return QueryResponse(
        job_id=job_id,
        query=plan.query,
        intent=plan.intent,
        temporal_range=plan.temporal_range,
        primary_metric=plan.primary_metric,
        sensor=plan.sensor,
        synthesized_report=synth,
        metrics=synth.get("metrics", {}),
        audit_record=audit,
        execution_trace=exec_result["execution_trace"],
        map_layers=exec_result["map_layers"],
        total_latency_ms=exec_result["total_latency_ms"]
    )


@router.get("/stream")
async def stream_query(query: str, aoi: str = ""):
    """SSE streaming endpoint providing live real-time DAG reasoning step updates."""
    async def event_generator():
        plan = planner.plan(query=query, aoi_override=aoi if aoi else None)
        yield f"data: {json.dumps({'type': 'plan_ready', 'plan': plan.model_dump()})}\n\n"
        await asyncio.sleep(0.1)

        for idx, node in enumerate(plan.nodes):
            yield f"data: {json.dumps({'type': 'step_start', 'step_index': idx, 'step_id': node.id, 'tool': node.tool, 'desc': node.description})}\n\n"
            await asyncio.sleep(0.2)
            
        exec_result = executor.execute(plan)
        synth = synthesizer.synthesize(plan, exec_result)
        audit = audit_ledger.create_audit_record(query, plan.model_dump(), exec_result["execution_trace"], exec_result["zonal_summary"])

        yield f"data: {json.dumps({'type': 'complete', 'synth': synth, 'audit': audit, 'metrics': synth.get('metrics', {}), 'trace': exec_result['execution_trace'], 'layers': exec_result['map_layers']})}\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")
