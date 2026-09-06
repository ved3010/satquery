"""
Bi-Temporal and Multi-Temporal Change Detection Engine.
Calculates pixel-wise spectral deltas, adaptive Otsu thresholding, and directional change masks.
"""

import numpy as np
from typing import Dict, Any, Optional
from satquery.tools.base import BaseTool, tool_registry


def otsu_threshold(image: np.ndarray, num_bins: int = 256) -> float:
    """Compute Otsu threshold for 2D numpy array."""
    valid = image[~np.isnan(image)]
    if len(valid) == 0:
        return 0.0
    hist, bin_edges = np.histogram(valid, bins=num_bins)
    bin_centers = (bin_edges[:-1] + bin_edges[1:]) / 2.0
    
    total = len(valid)
    current_max = 0.0
    threshold = bin_centers[0]
    weight_back = 0.0
    sum_back = 0.0
    sum_total = np.sum(hist * bin_centers)
    
    for i in range(num_bins):
        weight_back += hist[i]
        if weight_back == 0:
            continue
        weight_fore = total - weight_back
        if weight_fore == 0:
            break
        
        sum_back += hist[i] * bin_centers[i]
        mean_back = sum_back / weight_back
        mean_fore = (sum_total - sum_back) / weight_fore
        
        var_between = weight_back * weight_fore * ((mean_back - mean_fore) ** 2)
        if var_between > current_max:
            current_max = var_between
            threshold = bin_centers[i]
            
    return float(threshold)


class ChangeDetectionTool(BaseTool):
    name = "detect_bitemporal_change"
    description = "Computes quantitative bi-temporal spectral change, magnitude delta, and categorical loss/gain masks between T1 and T2."
    category = "change_detection"

    parameters_schema = {
        "raster_t1": {
            "type": "array",
            "description": "Baseline 2D raster array (e.g. NDVI, NDWI, or NDBI at Time 1)",
            "required": True
        },
        "raster_t2": {
            "type": "array",
            "description": "Target 2D raster array (e.g. NDVI, NDWI, or NDBI at Time 2)",
            "required": True
        },
        "metric": {
            "type": "string",
            "description": "Metric name: 'NDVI' (Vegetation), 'NDWI' (Water), 'NDBI' (Urban), 'NBR' (Burn), 'SAR' (Radar)",
            "required": False,
            "default": "NDVI"
        },
        "sensitivity": {
            "type": "float",
            "description": "Change threshold sensitivity (default 0.15)",
            "required": False,
            "default": 0.15
        }
    }
    output_type = "dict"

    def run(
        self,
        raster_t1: np.ndarray,
        raster_t2: np.ndarray,
        metric: str = "NDVI",
        sensitivity: float = 0.15,
        **kwargs
    ) -> Dict[str, Any]:
        t1 = np.nan_to_num(raster_t1, nan=0.0)
        t2 = np.nan_to_num(raster_t2, nan=0.0)
        
        if t1.shape != t2.shape:
            raise ValueError(f"Raster shape mismatch: T1={t1.shape}, T2={t2.shape}")

        delta = t2 - t1
        abs_delta = np.abs(delta)
        
        # Adaptive thresholding
        auto_thresh = otsu_threshold(abs_delta)
        eff_thresh = max(sensitivity, auto_thresh * 0.75)
        
        # Binary change mask
        change_mask = (abs_delta >= eff_thresh).astype(np.uint8)
        
        # Directional categories:
        # -1: Significant Decline / Loss (e.g. Deforestation, Lake Shrinkage)
        #  0: Stable
        # +1: Significant Increase / Gain (e.g. Afforestation, Urban Growth, Flood)
        categorical_map = np.zeros_like(delta, dtype=np.int8)
        categorical_map[delta <= -eff_thresh] = -1
        categorical_map[delta >= eff_thresh] = 1

        total_pixels = delta.size
        decline_pixels = int(np.sum(categorical_map == -1))
        gain_pixels = int(np.sum(categorical_map == 1))
        stable_pixels = int(np.sum(categorical_map == 0))
        
        decline_pct = round((decline_pixels / total_pixels) * 100.0, 2)
        gain_pct = round((gain_pixels / total_pixels) * 100.0, 2)
        stable_pct = round((stable_pixels / total_pixels) * 100.0, 2)

        return {
            "metric": metric,
            "effective_threshold": round(float(eff_thresh), 4),
            "delta_grid": delta,
            "magnitude_grid": abs_delta,
            "change_mask": change_mask,
            "categorical_map": categorical_map,
            "statistics": {
                "mean_delta": float(np.mean(delta)),
                "max_increase": float(np.max(delta)),
                "max_decrease": float(np.min(delta)),
                "loss_percentage": decline_pct,
                "gain_percentage": gain_pct,
                "stable_percentage": stable_pct,
                "loss_pixels": decline_pixels,
                "gain_pixels": gain_pixels,
                "stable_pixels": stable_pixels,
                "total_pixels": total_pixels
            }
        }


tool_registry.register(ChangeDetectionTool())
