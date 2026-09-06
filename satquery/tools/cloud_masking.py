"""
Cloud and Atmospheric Artifacts Masking Tool for Sentinel-2 / Landsat scenes.
"""

import numpy as np
from typing import Dict, Any, Optional
from satquery.tools.base import BaseTool, tool_registry


class CloudMaskingTool(BaseTool):
    name = "apply_cloud_mask"
    description = "Removes clouds, cirrus, and cloud shadows from multi-spectral bands using Sentinel-2 Scene Classification Layer (SCL) or QA thresholds."
    category = "preprocessing"

    parameters_schema = {
        "bands": {
            "type": "dict",
            "description": "Multi-band dictionary containing 'SCL' or spectral arrays",
            "required": True
        },
        "mask_cloud_shadow": {
            "type": "bool",
            "description": "Whether to mask cloud shadows (SCL=3)",
            "required": False,
            "default": True
        }
    }
    output_type = "dict"

    def run(self, bands: Dict[str, np.ndarray], mask_cloud_shadow: bool = True, **kwargs) -> Dict[str, Any]:
        scl = bands.get("SCL")
        
        if scl is not None:
            # Sentinel-2 SCL Classes:
            # 3: Cloud Shadows, 8: Cloud Medium Prob, 9: Cloud High Prob, 10: Thin Cirrus
            bad_pixels = (scl == 8) | (scl == 9) | (scl == 10)
            if mask_cloud_shadow:
                bad_pixels = bad_pixels | (scl == 3)
        else:
            # Radiometric threshold fallback: High blue + high SWIR brightness
            b02 = bands.get("B02", np.zeros((256, 256)))
            b11 = bands.get("B11", np.zeros((256, 256)))
            bad_pixels = (b02 > 0.45) & (b11 > 0.35)

        valid_mask = ~bad_pixels
        total_pixels = bad_pixels.size
        cloud_pixels = int(np.sum(bad_pixels))
        cloud_cover_pct = float((cloud_pixels / total_pixels) * 100.0)

        cleaned_bands = {}
        for band_name, band_data in bands.items():
            if isinstance(band_data, np.ndarray):
                cleaned = band_data.copy()
                if band_data.dtype in [np.float32, np.float64]:
                    cleaned[bad_pixels] = np.nan
                cleaned_bands[band_name] = cleaned

        return {
            "cloud_cover_percent": round(cloud_cover_pct, 2),
            "cloud_pixels": cloud_pixels,
            "valid_pixels": int(np.sum(valid_mask)),
            "valid_mask": valid_mask,
            "cleaned_bands": cleaned_bands
        }


tool_registry.register(CloudMaskingTool())
