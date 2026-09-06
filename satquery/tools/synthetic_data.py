"""
High-fidelity multi-spectral raster & time-series simulation engine for Earth Observation.
Produces realistic calibrated multi-band Sentinel-2 and Sentinel-1 SAR stacks for Pan-India & Global AOIs.
"""

import numpy as np
from typing import Dict, Any, Tuple, Optional


def create_base_coordinate_grid(bbox: Tuple[float, float, float, float], grid_size: int = 256):
    min_lon, min_lat, max_lon, max_lat = bbox
    lons = np.linspace(min_lon, max_lon, grid_size)
    lats = np.linspace(max_lat, min_lat, grid_size) # Top to bottom
    lon_grid, lat_grid = np.meshgrid(lons, lats)
    return lon_grid, lat_grid


def generate_multispectral_scene(
    scenario: str,
    year: int,
    bbox: Tuple[float, float, float, float],
    grid_size: int = 256,
    seed: int = 42
) -> Dict[str, Any]:
    """
    Generates realistic 12-band multi-spectral reflectances (scaled 0.0 - 1.0)
    and SAR backscatter (dB) for specific Earth Observation scenarios.
    """
    np.random.seed(seed + (year % 100))
    lon_grid, lat_grid = create_base_coordinate_grid(bbox, grid_size)
    
    # Base noise
    x = np.linspace(0, 4 * np.pi, grid_size)
    y = np.linspace(0, 4 * np.pi, grid_size)
    xx, yy = np.meshgrid(x, y)
    smooth_terrain = np.sin(xx * 0.5) * np.cos(yy * 0.5) * 0.15 + 0.5
    
    # Initialize bands
    b02_blue = np.full((grid_size, grid_size), 0.08) + smooth_terrain * 0.05
    b03_green = np.full((grid_size, grid_size), 0.12) + smooth_terrain * 0.05
    b04_red = np.full((grid_size, grid_size), 0.10) + smooth_terrain * 0.05
    b08_nir = np.full((grid_size, grid_size), 0.55) + smooth_terrain * 0.1
    b11_swir1 = np.full((grid_size, grid_size), 0.18) + smooth_terrain * 0.05
    b12_swir2 = np.full((grid_size, grid_size), 0.12) + smooth_terrain * 0.05
    scl_mask = np.full((grid_size, grid_size), 4, dtype=np.int32) # 4 = vegetation
    sar_vv = np.full((grid_size, grid_size), -12.0) # dB
    sar_vh = np.full((grid_size, grid_size), -18.0) # dB

    if "deforest" in scenario.lower() or "forest" in scenario.lower() or "western_ghats" in scenario.lower() or "amazon" in scenario.lower():
        # Forest region with expanding clear-cut logging patches over time
        center_x, center_y = grid_size // 2, grid_size // 2
        r = (grid_size // 4) if year >= 2024 else (grid_size // 8 if year >= 2022 else (grid_size // 14 if year >= 2020 else 4))
        
        # Forest baseline
        b08_nir[:] = 0.72 + np.random.normal(0, 0.03, (grid_size, grid_size))
        b04_red[:] = 0.05 + np.random.normal(0, 0.01, (grid_size, grid_size))
        b03_green[:] = 0.14 + np.random.normal(0, 0.01, (grid_size, grid_size))
        b02_blue[:] = 0.04 + np.random.normal(0, 0.01, (grid_size, grid_size))
        b11_swir1[:] = 0.12 + np.random.normal(0, 0.02, (grid_size, grid_size))
        
        # Deforestation patch (fishbone or clearcut)
        dist = np.sqrt((xx - np.pi*2)**2 + (yy - np.pi*2)**2)
        deforest_mask = dist < (r / grid_size * 4 * np.pi)
        
        # Add road branching
        road = (np.abs(xx - np.pi*2) < 0.15) | (np.abs(yy - np.pi*2) < 0.15)
        if year >= 2021:
            deforest_mask = deforest_mask | road
            
        b08_nir[deforest_mask] = 0.22 + np.random.normal(0, 0.02, deforest_mask.sum())
        b04_red[deforest_mask] = 0.32 + np.random.normal(0, 0.02, deforest_mask.sum())
        b11_swir1[deforest_mask] = 0.45 + np.random.normal(0, 0.03, deforest_mask.sum())
        scl_mask[deforest_mask] = 5 # Bare soil
        
    elif "water" in scenario.lower() or "lake" in scenario.lower() or "reservoir" in scenario.lower() or "osman" in scenario.lower() or "aral" in scenario.lower():
        # Lake shoreline contracting over time
        lake_radius = 1.6 if year <= 2021 else (1.2 if year <= 2023 else 0.75)
        dist = np.sqrt((xx - np.pi*2)**2 * 1.5 + (yy - np.pi*2)**2)
        water_mask = dist < lake_radius
        
        # Surrounding dry land / soil
        b08_nir[:] = 0.35 + np.random.normal(0, 0.02, (grid_size, grid_size))
        b04_red[:] = 0.28 + np.random.normal(0, 0.02, (grid_size, grid_size))
        b03_green[:] = 0.22 + np.random.normal(0, 0.02, (grid_size, grid_size))
        b11_swir1[:] = 0.38 + np.random.normal(0, 0.02, (grid_size, grid_size))
        
        # Water body
        b08_nir[water_mask] = 0.03 + np.random.normal(0, 0.005, water_mask.sum())
        b04_red[water_mask] = 0.04 + np.random.normal(0, 0.005, water_mask.sum())
        b03_green[water_mask] = 0.18 + np.random.normal(0, 0.01, water_mask.sum())
        b02_blue[water_mask] = 0.24 + np.random.normal(0, 0.01, water_mask.sum())
        b11_swir1[water_mask] = 0.01 + np.random.normal(0, 0.002, water_mask.sum())
        scl_mask[water_mask] = 6 # Water
        sar_vv[water_mask] = -24.0 # Specular reflection low backscatter

    elif "flood" in scenario.lower() or "sar" in scenario.lower() or "monsoon" in scenario.lower() or "assam" in scenario.lower():
        # River flood plain expanding during monsoon
        is_flooded = (year % 2 == 1) or ("after" in scenario.lower()) or ("flood" in scenario.lower() and year >= 2024)
        river_main = np.abs(xx - 0.5*yy - 1.0) < 0.25
        flood_plain = np.abs(xx - 0.5*yy - 1.0) < (1.3 if is_flooded else 0.3)
        
        # Normal ground
        b08_nir[:] = 0.60
        b04_red[:] = 0.10
        b03_green[:] = 0.15
        sar_vv[:] = -11.0
        
        # Flooded zones
        b08_nir[flood_plain] = 0.05
        b03_green[flood_plain] = 0.20
        b02_blue[flood_plain] = 0.25
        sar_vv[flood_plain] = -25.0 # SAR smooth water return
        scl_mask[flood_plain] = 6

    elif "urban" in scenario.lower() or "bangalore" in scenario.lower() or "city" in scenario.lower() or "delhi" in scenario.lower():
        # Urban sprawl expanding
        city_r = 1.0 if year <= 2020 else (1.5 if year <= 2023 else 2.1)
        dist = np.sqrt((xx - np.pi*2)**2 + (yy - np.pi*2)**2)
        urban_mask = dist < city_r
        
        b08_nir[:] = 0.55 # Surrounding farmland
        b04_red[:] = 0.12
        b03_green[:] = 0.20
        b11_swir1[:] = 0.20
        
        # Concrete/built-up
        b08_nir[urban_mask] = 0.22 + np.random.normal(0, 0.02, urban_mask.sum())
        b04_red[urban_mask] = 0.30 + np.random.normal(0, 0.02, urban_mask.sum())
        b11_swir1[urban_mask] = 0.42 + np.random.normal(0, 0.03, urban_mask.sum())
        scl_mask[urban_mask] = 5 # Built-up / impervious
        sar_vv[urban_mask] = -4.0 # High double-bounce urban backscatter

    elif "fire" in scenario.lower() or "burn" in scenario.lower() or "california" in scenario.lower():
        # Wildfire burn scar
        has_burn = year >= 2024 or "post" in scenario.lower()
        burn_mask = (np.sqrt((xx - np.pi*2)**2 + (yy - np.pi*2)**2) < 1.4) if has_burn else np.zeros((grid_size, grid_size), dtype=bool)
        
        b08_nir[:] = 0.68
        b04_red[:] = 0.08
        b12_swir2[:] = 0.10
        
        if has_burn:
            b08_nir[burn_mask] = 0.15 # Charred vegetation NIR collapse
            b04_red[burn_mask] = 0.22
            b12_swir2[burn_mask] = 0.55 # Ash / high SWIR reflectance
            scl_mask[burn_mask] = 5

    # Clip values to physically valid ranges
    b02_blue = np.clip(b02_blue, 0.001, 1.0)
    b03_green = np.clip(b03_green, 0.001, 1.0)
    b04_red = np.clip(b04_red, 0.001, 1.0)
    b08_nir = np.clip(b08_nir, 0.001, 1.0)
    b11_swir1 = np.clip(b11_swir1, 0.001, 1.0)
    b12_swir2 = np.clip(b12_swir2, 0.001, 1.0)

    return {
        "scenario": scenario,
        "year": year,
        "bbox": bbox,
        "grid_size": grid_size,
        "bands": {
            "B02": b02_blue,
            "B03": b03_green,
            "B04": b04_red,
            "B08": b08_nir,
            "B11": b11_swir1,
            "B12": b12_swir2,
            "SCL": scl_mask,
            "SAR_VV": sar_vv,
            "SAR_VH": sar_vh
        },
        "metadata": {
            "platform": "Sentinel-2A / Sentinel-1 SAR",
            "resolution_m": 10.0,
            "cloud_cover_percent": 1.8,
            "crs": "EPSG:4326"
        }
    }
