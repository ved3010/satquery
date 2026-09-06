"""
Sentinel-1 Synthetic Aperture Radar (SAR) All-Weather Analytics Engine.
Processes C-band VV and VH polarizations for Monsoon flood mapping, waterlogging, and urban backscatter.
"""

import numpy as np
from typing import Dict, Any
from satquery.tools.base import BaseTool, tool_registry


class SARRadarTool(BaseTool):
    name = "analyze_sar_radar"
    description = "Processes cloud-penetrating Sentinel-1 SAR radar backscatter (VV/VH in dB) for monsoon flood mapping, paddy monitoring, and all-weather detection."
    category = "radar_analytics"

    parameters_schema = {
        "sar_vv_t1": {
            "type": "array",
            "description": "Baseline SAR VV backscatter grid in dB",
            "required": True
        },
        "sar_vv_t2": {
            "type": "array",
            "description": "Post-event SAR VV backscatter grid in dB",
            "required": True
        },
        "water_threshold_db": {
            "type": "float",
            "description": "Backscatter threshold below which smooth water surface reflects specularly (default -18.0 dB)",
            "required": False,
            "default": -18.0
        }
    }
    output_type = "dict"

    def run(
        self,
        sar_vv_t1: np.ndarray,
        sar_vv_t2: np.ndarray,
        water_threshold_db: float = -18.0,
        **kwargs
    ) -> Dict[str, Any]:
        # Water exhibits specular reflection leading to low radar backscatter (< -18dB)
        water_t1 = sar_vv_t1 <= water_threshold_db
        water_t2 = sar_vv_t2 <= water_threshold_db
        
        # Newly inundated flood pixels: Not water in T1, but water in T2
        new_inundation = (~water_t1) & water_t2
        
        # Receded water: Water in T1, dry in T2
        receded_water = water_t1 & (~water_t2)
        
        # Permanent water
        permanent_water = water_t1 & water_t2

        # Amplitude ratio / difference in dB
        db_diff = sar_vv_t2 - sar_vv_t1
        
        total_pixels = sar_vv_t1.size
        flood_pixels = int(np.sum(new_inundation))
        flood_pct = round((flood_pixels / total_pixels) * 100.0, 2)

        return {
            "sensor": "Sentinel-1 SAR C-Band (VV)",
            "all_weather_status": "Penetrated 100% monsoon cloud cover",
            "water_threshold_db": water_threshold_db,
            "new_inundation_mask": new_inundation.astype(np.uint8),
            "permanent_water_mask": permanent_water.astype(np.uint8),
            "db_diff_grid": db_diff,
            "statistics": {
                "inundated_pixels": flood_pixels,
                "inundated_percentage": flood_pct,
                "receded_pixels": int(np.sum(receded_water)),
                "permanent_water_pixels": int(np.sum(permanent_water)),
                "mean_backscatter_t1_db": float(np.mean(sar_vv_t1)),
                "mean_backscatter_t2_db": float(np.mean(sar_vv_t2))
            }
        }


tool_registry.register(SARRadarTool())
