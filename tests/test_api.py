from fastapi.testclient import TestClient
from satquery.main import app

client = TestClient(app)


def test_api_examples_endpoint():
    resp = client.get("/api/examples")
    assert resp.status_code == 200
    data = resp.json()
    assert "presets" in data
    assert len(data["presets"]) >= 4


def test_api_tools_endpoint():
    resp = client.get("/api/tools")
    assert resp.status_code == 200
    data = resp.json()
    assert "tools" in data
    tool_names = [t["name"] for t in data["tools"]]
    assert "compute_spectral_index" in tool_names
    assert "detect_bitemporal_change" in tool_names


def test_api_query_endpoint():
    resp = client.post(
        "/api/query",
        json={"query": "What changed in Western Ghats between 2020 and 2025?"}
    )
    assert resp.status_code == 200
    data = resp.json()
    assert "job_id" in data
    assert data["primary_metric"] == "NDVI"
    assert "synthesized_report" in data
    assert "audit_record" in data
    assert len(data["execution_trace"]) >= 6
    assert "map_layers" in data
