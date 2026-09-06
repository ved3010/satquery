"""
Multi-spectral Earth Observation Indices Engine.
Provides deterministic calculations for biophysical vegetation, water, burn scar, and urban indices.
"""

import numpy as np
from typing import Dict, Any
from satquery.tools.base import BaseTool, tool_registry


class SpectralIndicesTool(BaseTool):
    name = "compute_spectral_index"
    description = "Computes calibrated remote sensing biophysical indices (NDVI, NDWI, NBR, NDBI, NDMI, EVI, SAVI, BSI) from multi-spectral bands."
    category = "spectral_analytics"
    
    parameters_schema = {
        "index_type": {
            "type": "string",
            "description": "Index to compute: 'NDVI', 'NDWI', 'NBR', 'NDBI', 'NDMI', 'EVI', 'SAVI', 'BSI'",
            "required": True,
            "default": "NDVI"
        },
        "bands": {
            "type": "dict",
            "description": "Dictionary of band numpy arrays e.g. {'B02': arr, 'B03': arr, 'B04': arr, 'B08': arr, 'B11': arr, 'B12': arr}",
            "required": True
        }
    }
    output_type = "dict"

    def run(self, index_type: str, bands: Dict[str, np.ndarray], **kwargs) -> Dict[str, Any]:
        index_type = index_type.upper().strip()
        eps = 1e-7
        
        b02 = bands.get("B02") # Blue
        b03 = bands.get("B03") # Green
        b04 = bands.get("B04") # Red
        b08 = bands.get("B08") # NIR
        b11 = bands.get("B11") # SWIR-1
        b12 = bands.get("B12") # SWIR-2
        
        if index_type == "NDVI":
            if b08 is None or b04 is None:
                raise ValueError("NDVI requires B08 (NIR) and B04 (Red) bands.")
            numerator = b08 - b04
            denominator = b08 + b04 + eps
            result = numerator / denominator
            formula = "(B08 - B04) / (B08 + B04)"
            label = "Normalized Difference Vegetation Index"
            
        elif index_type == "NDWI":
            if b03 is None or b08 is None:
                raise ValueError("NDWI requires B03 (Green) and B08 (NIR) bands.")
            numerator = b03 - b08
            denominator = b03 + b08 + eps
            result = numerator / denominator
            formula = "(B03 - B08) / (B03 + B08)"
            label = "Normalized Difference Water Index"

        elif index_type == "NBR":
            if b08 is None or b12 is None:
                raise ValueError("NBR requires B08 (NIR) and B12 (SWIR-2) bands.")
            numerator = b08 - b12
            denominator = b08 + b12 + eps
            result = numerator / denominator
            formula = "(B08 - B12) / (B08 + B12)"
            label = "Normalized Burn Ratio"

        elif index_type == "NDBI":
            if b11 is None or b08 is None:
                raise ValueError("NDBI requires B11 (SWIR-1) and B08 (NIR) bands.")
            numerator = b11 - b08
            denominator = b11 + b08 + eps
            result = numerator / denominator
            formula = "(B11 - B08) / (B11 + B08)"
            label = "Normalized Difference Built-up Index"

        elif index_type == "NDMI":
            if b08 is None or b11 is None:
                raise ValueError("NDMI requires B08 (NIR) and B11 (SWIR-1) bands.")
            numerator = b08 - b11
            denominator = b08 + b11 + eps
            result = numerator / denominator
            formula = "(B08 - B11) / (B08 + B11)"
            label = "Normalized Difference Moisture Index"

        elif index_type == "EVI":
            if b08 is None or b04 is None or b02 is None:
                raise ValueError("EVI requires B08 (NIR), B04 (Red), and B02 (Blue) bands.")
            numerator = 2.5 * (b08 - b04)
            denominator = b08 + 6.0 * b04 - 7.5 * b02 + 1.0 + eps
            result = numerator / denominator
            formula = "2.5 * (B08 - B04) / (B08 + 6*B04 - 7.5*B02 + 1)"
            label = "Enhanced Vegetation Index"

        elif index_type == "SAVI":
            if b08 is None or b04 is None:
                raise ValueError("SAVI requires B08 (NIR) and B04 (Red) bands.")
            L = 0.5
            numerator = (b08 - b04) * (1.0 + L)
            denominator = b08 + b04 + L + eps
            result = numerator / denominator
            formula = "(1.5 * (B08 - B04)) / (B08 + B04 + 0.5)"
            label = "Soil-Adjusted Vegetation Index"

        elif index_type == "BSI":
            if b11 is None or b04 is None or b08 is None or b02 is None:
                raise ValueError("BSI requires B11 (SWIR1), B04 (Red), B08 (NIR), and B02 (Blue) bands.")
            numerator = (b11 + b04) - (b08 + b02)
            denominator = (b11 + b04) + (b08 + b02) + eps
            result = numerator / denominator
            formula = "((B11 + B04) - (B08 + B02)) / ((B11 + B04) + (B08 + B02))"
            label = "Bare Soil Index"
            
        else:
            raise ValueError(f"Unsupported spectral index: '{index_type}'.")

        result = np.clip(result, -1.0, 1.0)

        return {
            "index_type": index_type,
            "label": label,
            "formula": formula,
            "grid": result,
            "stats": {
                "min": float(np.min(result)),
                "max": float(np.max(result)),
                "mean": float(np.mean(result)),
                "std": float(np.std(result)),
                "median": float(np.median(result))
            }
        }


tool_registry.register(SpectralIndicesTool())
