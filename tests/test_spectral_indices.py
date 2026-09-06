import numpy as np
import pytest
from satquery.tools.spectral_indices import SpectralIndicesTool


def test_ndvi_calculation():
    tool = SpectralIndicesTool()
    grid_size = 64
    
    # Dense vegetation: High NIR (0.8), Low Red (0.1) -> NDVI = (0.8 - 0.1) / (0.8 + 0.1) = 0.7 / 0.9 = 0.777
    b08 = np.full((grid_size, grid_size), 0.8)
    b04 = np.full((grid_size, grid_size), 0.1)
    
    res = tool.run(index_type="NDVI", bands={"B08": b08, "B04": b04})
    
    assert res["index_type"] == "NDVI"
    assert res["formula"] == "(B08 - B04) / (B08 + B04)"
    assert np.allclose(res["grid"], 0.777777, atol=1e-3)
    assert res["stats"]["min"] > 0.75
    assert res["stats"]["max"] < 0.80


def test_ndwi_calculation():
    tool = SpectralIndicesTool()
    grid_size = 64
    
    # Clear water: High Green (0.3), Low NIR (0.02) -> NDWI = (0.3 - 0.02) / (0.3 + 0.02) = 0.28 / 0.32 = 0.875
    b03 = np.full((grid_size, grid_size), 0.3)
    b08 = np.full((grid_size, grid_size), 0.02)
    
    res = tool.run(index_type="NDWI", bands={"B03": b03, "B08": b08})
    
    assert res["index_type"] == "NDWI"
    assert np.allclose(res["grid"], 0.875, atol=1e-3)


def test_nbr_calculation():
    tool = SpectralIndicesTool()
    grid_size = 64
    
    # Burned area: Low NIR (0.1), High SWIR2 (0.6) -> NBR = (0.1 - 0.6) / (0.1 + 0.6) = -0.5 / 0.7 = -0.714
    b08 = np.full((grid_size, grid_size), 0.1)
    b12 = np.full((grid_size, grid_size), 0.6)
    
    res = tool.run(index_type="NBR", bands={"B08": b08, "B12": b12})
    
    assert res["index_type"] == "NBR"
    assert res["grid"][0, 0] < -0.7
