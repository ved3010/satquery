from satquery.agent.planner import AgentPlanner


def test_planner_forest_deforestation():
    planner = AgentPlanner()
    plan = planner.plan(query="What changed in Western Ghats between 2020 and 2025?")
    
    assert plan.primary_metric == "NDVI"
    assert plan.target_aoi == "western_ghats"
    assert plan.temporal_range["t1"] == 2020
    assert plan.temporal_range["t2"] == 2025
    assert len(plan.nodes) >= 6
    
    tools = [n.tool for n in plan.nodes]
    assert "search_and_fetch_stac_scene" in tools
    assert "apply_cloud_mask" in tools
    assert "compute_spectral_index" in tools
    assert "detect_bitemporal_change" in tools
    assert "compute_zonal_statistics" in tools


def test_planner_water_depletion():
    planner = AgentPlanner()
    plan = planner.plan(query="Calculate surface water loss in Osman Sagar lake between 2021 and 2024")
    
    assert plan.primary_metric == "NDWI"
    assert plan.target_aoi == "osman_sagar"
    assert plan.temporal_range["t1"] == 2021
    assert plan.temporal_range["t2"] == 2024


def test_planner_sar_flood():
    planner = AgentPlanner()
    plan = planner.plan(query="Assess Assam flood inundation with Sentinel-1 SAR radar")
    
    assert plan.primary_metric == "SAR_VV"
    assert "Sentinel-1" in plan.sensor
    assert any(n.tool == "analyze_sar_radar" for n in plan.nodes)
