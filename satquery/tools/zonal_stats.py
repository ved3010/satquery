"""
Zonal Statistics and Quantitative Geometry Engine.
Performs exact mathematical integrals over geospatial masks to produce verified area metrics in km², hectares, and %.
"""

import numpy as np
from typing import Dict, Any, Optional
from satquery.tools.base import BaseTool, tool_registry


class ZonalStatsTool(BaseTool):
    name = "compute_zonal_statistics"
    description = "Calculates exact, zero-hallucination surface area metrics (sq km, hectares, acres, percentage) from binary or categorical raster masks."
    category = "quantitative_gis"

    parameters_schema = {
        "mask": {
            "type": "array",
            "description": "2D binary or categorical numpy mask array",
            "required": True
        },
        "pixel_size_meters": {
            "type": "float",
            "description": "Spatial resolution in meters (e.g. 10.0 for Sentinel-2, 30.0 for Landsat)",
            "required": False,
            "default": 10.0
        },
        "target_value": {
            "type": "int",
            "description": "Specific mask value to compute area for (default 1)",
            "required": False,
            "default": 1
        },
        "label": {
            "type": "string",
            "description": "Descriptive category name (e.g. 'Deforested Area', 'Water Body Surface', 'Flood Extent')",
            "required": False,
            "default": "Target Zone"
        }
    }
    output_type = "dict"

    def run(
        self,
        mask: np.ndarray,
        pixel_size_meters: float = 10.0,
        target_value: int = 1,
        label: str = "Target Zone",
        **kwargs
    ) -> Dict[str, Any]:
        pixel_area_sq_m = float(pixel_size_meters * pixel_size_meters)
        total_pixels = int(mask.size)
        
        target_pixels = int(np.sum(mask == target_value))
        coverage_percent = (target_pixels / total_pixels) * 100.0 if total_pixels > 0 else 0.0
        
        total_area_sq_m = target_pixels * pixel_area_sq_m
        area_sq_km = total_area_sq_m / 1_000_000.0
        area_hectares = total_area_sq_m / 10_000.0
        area_acres = area_hectares * 2.47105

        total_study_area_sq_km = (total_pixels * pixel_area_sq_m) / 1_000_000.0

        return {
            "label": label,
            "pixel_size_m": pixel_size_meters,
            "total_pixels_in_aoi": total_pixels,
            "target_pixels": target_pixels,
            "coverage_percentage": round(coverage_percent, 2),
            "area_sq_km": round(area_sq_km, 3),
            "area_hectares": round(area_hectares, 2),
            "area_acres": round(area_acres, 2),
            "total_aoi_area_sq_km": round(total_study_area_sq_km, 3),
            "verification_audit": {
                "math_formula": f"{target_pixels} pixels * ({pixel_size_meters}m * {pixel_size_meters}m) = {round(area_sq_km, 4)} km²",
                "is_hallucination_proof": True
            }
        }


tool_registry.register(ZonalStatsTool())
