"""
Autonomous Geospatial DAG Planner.
Decomposes natural language queries into an executable Directed Acyclic Graph (DAG) of Remote Sensing tools.
"""

import re
from typing import Dict, Any, List, Optional
from pydantic import BaseModel, Field


class DAGNode(BaseModel):
    id: str
    tool: str
    description: str
    inputs: Dict[str, Any] = Field(default_factory=dict)
    dependencies: List[str] = Field(default_factory=list)


class ExecutionPlan(BaseModel):
    query: str
    intent: str
    target_aoi: str
    temporal_range: Dict[str, int]
    primary_metric: str
    sensor: str
    nodes: List[DAGNode]


class AgentPlanner:
    def plan(self, query: str, aoi_override: Optional[str] = None, year_t1: Optional[int] = None, year_t2: Optional[int] = None) -> ExecutionPlan:
        q = query.lower()
        
        # 1. Determine Years
        years_found = [int(y) for y in re.findall(r'\b(19\d\d|20\d\d)\b', q)]
        if len(years_found) >= 2:
            t1, t2 = sorted(years_found[:2])
        elif len(years_found) == 1:
            t1 = years_found[0] - 3
            t2 = years_found[0]
        else:
            t1 = year_t1 or 2020
            t2 = year_t2 or 2025

        # 2. Determine Location / AOI
        aoi = aoi_override
        if not aoi:
            if "western ghats" in q or "ghats" in q:
                aoi = "western_ghats"
            elif "osman sagar" in q or "hyderabad" in q or "lake" in q or "reservoir" in q or "water" in q:
                aoi = "osman_sagar"
            elif "bangalore" in q or "bengaluru" in q or "urban" in q or "city" in q:
                aoi = "bangalore_urban"
            elif "assam" in q or "brahmaputra" in q or "flood" in q or "monsoon" in q:
                aoi = "assam_flood_sar"
            elif "punjab" in q or "stubble" in q or "fire" in q or "burn" in q:
                aoi = "punjab_stubble_burn"
            elif "amazon" in q or "brazil" in q or "rainforest" in q:
                aoi = "amazon_rainforest"
            else:
                aoi = "western_ghats"

        # 3. Determine RS Domain, Sensor & Primary Metric
        if "flood" in q or "sar" in q or "monsoon" in q:
            intent = "Monsoon Flood Inundation & SAR Analysis"
            primary_metric = "SAR_VV"
            sensor = "Sentinel-1 SAR C-Band"
            category = "flood"
        elif "water" in q or "lake" in q or "pond" in q or "reservoir" in q or "drought" in q:
            intent = "Surface Water Body Delineation & Depletion"
            primary_metric = "NDWI"
            sensor = "Sentinel-2 MSI (10m)"
            category = "water"
        elif "urban" in q or "city" in q or "built" in q or "construction" in q or "sprawl" in q:
            intent = "Urban Built-Up & Concrete Expansion"
            primary_metric = "NDBI"
            sensor = "Sentinel-2 MSI (10m)"
            category = "urban"
        elif "fire" in q or "burn" in q or "stubble" in q or "scar" in q:
            intent = "Wildfire & Crop Residue Burn Severity"
            primary_metric = "NBR"
            sensor = "Sentinel-2 MSI (20m)"
            category = "fire"
        else: # Default: Vegetation / Deforestation / Land Change
            intent = "Bi-Temporal Vegetation Loss & Deforestation Detection"
            primary_metric = "NDVI"
            sensor = "Sentinel-2 MSI (10m)"
            category = "vegetation"

        # 4. Construct DAG Nodes
        nodes: List[DAGNode] = []

        # Node 1: Fetch Scene T1
        nodes.append(DAGNode(
            id="fetch_scene_t1",
            tool="search_and_fetch_stac_scene",
            description=f"Query STAC catalog for calibrated Sentinel scene at baseline year {t1}",
            inputs={"aoi_name_or_bbox": aoi, "year": t1}
        ))

        # Node 2: Fetch Scene T2
        nodes.append(DAGNode(
            id="fetch_scene_t2",
            tool="search_and_fetch_stac_scene",
            description=f"Query STAC catalog for calibrated Sentinel scene at target year {t2}",
            inputs={"aoi_name_or_bbox": aoi, "year": t2}
        ))

        # Node 3: Cloud Masking T1
        nodes.append(DAGNode(
            id="cloud_mask_t1",
            tool="apply_cloud_mask",
            description=f"Filter atmospheric haze and clouds on {t1} scene",
            inputs={"bands_ref": "fetch_scene_t1.bands"},
            dependencies=["fetch_scene_t1"]
        ))

        # Node 4: Cloud Masking T2
        nodes.append(DAGNode(
            id="cloud_mask_t2",
            tool="apply_cloud_mask",
            description=f"Filter atmospheric haze and clouds on {t2} scene",
            inputs={"bands_ref": "fetch_scene_t2.bands"},
            dependencies=["fetch_scene_t2"]
        ))

        if category == "flood":
            # SAR analysis
            nodes.append(DAGNode(
                id="sar_flood_detect",
                tool="analyze_sar_radar",
                description="Process Sentinel-1 SAR all-weather radar backscatter difference for flood extent",
                inputs={
                    "sar_vv_t1_ref": "fetch_scene_t1.bands.SAR_VV",
                    "sar_vv_t2_ref": "fetch_scene_t2.bands.SAR_VV"
                },
                dependencies=["fetch_scene_t1", "fetch_scene_t2"]
            ))
            nodes.append(DAGNode(
                id="zonal_statistics_flood",
                tool="compute_zonal_statistics",
                description="Compute exact flood inundation area in square kilometers and hectares",
                inputs={
                    "mask_ref": "sar_flood_detect.new_inundation_mask",
                    "pixel_size_meters": 10.0,
                    "target_value": 1,
                    "label": "Inundated Flood Water Extent"
                },
                dependencies=["sar_flood_detect"]
            ))
        else:
            # Optical Multi-spectral Index T1
            nodes.append(DAGNode(
                id="compute_index_t1",
                tool="compute_spectral_index",
                description=f"Calculate {primary_metric} biophysical grid for {t1}",
                inputs={"index_type": primary_metric, "bands_ref": "cloud_mask_t1.cleaned_bands"},
                dependencies=["cloud_mask_t1"]
            ))

            # Optical Multi-spectral Index T2
            nodes.append(DAGNode(
                id="compute_index_t2",
                tool="compute_spectral_index",
                description=f"Calculate {primary_metric} biophysical grid for {t2}",
                inputs={"index_type": primary_metric, "bands_ref": "cloud_mask_t2.cleaned_bands"},
                dependencies=["cloud_mask_t2"]
            ))

            # Change Detection
            nodes.append(DAGNode(
                id="detect_change",
                tool="detect_bitemporal_change",
                description=f"Compute bi-temporal difference & Otsu adaptive change mask between {t1} and {t2}",
                inputs={
                    "raster_t1_ref": "compute_index_t1.grid",
                    "raster_t2_ref": "compute_index_t2.grid",
                    "metric": primary_metric
                },
                dependencies=["compute_index_t1", "compute_index_t2"]
            ))

            # Zonal Area Calculations
            label_name = {
                "NDVI": "Deforested / Vegetation Loss Area",
                "NDWI": "Water Body Contraction / Depletion",
                "NDBI": "New Urban / Impervious Concrete Area",
                "NBR": "Burn Scar Extent"
            }.get(primary_metric, "Altered Surface Area")

            nodes.append(DAGNode(
                id="compute_zonal_metrics",
                tool="compute_zonal_statistics",
                description=f"Calculate exact surface area ({label_name}) in km² and hectares",
                inputs={
                    "mask_ref": "detect_change.categorical_map",
                    "pixel_size_meters": 10.0,
                    "target_value": -1 if primary_metric in ["NDVI", "NDWI", "NBR"] else 1,
                    "label": label_name
                },
                dependencies=["detect_change"]
            ))

        return ExecutionPlan(
            query=query,
            intent=intent,
            target_aoi=aoi,
            temporal_range={"t1": t1, "t2": t2},
            primary_metric=primary_metric,
            sensor=sensor,
            nodes=nodes
        )
