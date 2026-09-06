"""
SatQuery AI: Application Entrypoint and Server.
"""

import sys
import argparse
from pathlib import Path
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

from satquery.config import settings, WEB_DIR
from satquery.api.routes import router as api_router
from satquery.agent.planner import AgentPlanner
from satquery.agent.executor import AgentExecutor
from satquery.agent.synthesizer import EvidenceSynthesizer

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="Agentic Vision-Language Geospatial Assistant for Autonomous Remote Sensing Intelligence."
)

# Enable CORS for cross-origin UI interactions
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount API
app.include_router(api_router)

# Mount Web UI Static Files
if WEB_DIR.exists():
    app.mount("/static", StaticFiles(directory=str(WEB_DIR)), name="static")


@app.get("/")
def serve_index():
    index_file = WEB_DIR / "index.html"
    if index_file.exists():
        return FileResponse(index_file)
    return {"message": "SatQuery AI Backend Running. Web UI assets loading..."}


def run_cli(query: str, aoi: str = None):
    print(f"\n========================================================")
    print(f"🛰️  SATQUERY AI — AGENTIC GEOSPATIAL INTELLIGENCE")
    print(f"========================================================")
    print(f"User Query: {query}")
    if aoi:
        print(f"Target AOI: {aoi}")
    print(f"--------------------------------------------------------")
    
    planner = AgentPlanner()
    executor = AgentExecutor()
    synthesizer = EvidenceSynthesizer()

    print("[1/3] Decomposing query into Remote Sensing DAG...")
    plan = planner.plan(query=query, aoi_override=aoi)
    print(f"      • Intent: {plan.intent}")
    print(f"      • Sensor: {plan.sensor}")
    print(f"      • Primary Metric: {plan.primary_metric}")
    print(f"      • Planned Steps ({len(plan.nodes)}): {[n.tool for n in plan.nodes]}")
    
    print("\n[2/3] Executing Deterministic Earth Observation Pipeline...")
    result = executor.execute(plan)
    for step in result["execution_trace"]:
        print(f"      ✓ [{step['status']}] {step['tool']} ({step['runtime_ms']}ms) -> {step['description']}")
    
    print("\n[3/3] Grounded Evidence Synthesis:")
    synth = synthesizer.synthesize(plan, result)
    print(f"\n{synth['summary_text']}")
    print(f"\n📊 Quantitative Summary:")
    for k, v in synth.get("metrics", {}).items():
        print(f"   • {k}: {v}")
    print(f"========================================================\n")


def main():
    parser = argparse.ArgumentParser(description="SatQuery AI - Autonomous Geospatial Agent")
    parser.add_argument("--query", type=str, help="Natural language geospatial query to execute directly in CLI")
    parser.add_argument("--aoi", type=str, default=None, help="Target Area of Interest (AOI)")
    parser.add_argument("--port", type=int, default=settings.PORT, help="Port to run web server")
    parser.add_argument("--host", type=str, default=settings.HOST, help="Host address")
    args = parser.parse_args()

    if args.query:
        run_cli(args.query, args.aoi)
    else:
        print(f"Starting SatQuery AI server on http://{args.host}:{args.port}")
        uvicorn.run("satquery.main:app", host=args.host, port=args.port, reload=False)


if __name__ == "__main__":
    main()
