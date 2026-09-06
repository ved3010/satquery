import numpy as np
from satquery.tools.zonal_stats import ZonalStatsTool


def test_zonal_stats_accuracy():
    tool = ZonalStatsTool()
    grid_size = 100 # 10,000 pixels
    pixel_res = 10.0 # 10m x 10m -> 100 m² per pixel
    
    # Create mask with exactly 1,000 target pixels (10% of total)
    mask = np.zeros((grid_size, grid_size), dtype=np.int8)
    mask[:10, :100] = 1 # 1,000 pixels
    
    res = tool.run(mask=mask, pixel_size_meters=pixel_res, target_value=1, label="Deforestation")
    
    # 1,000 pixels * 100 m² = 100,000 m² = 0.1 km² = 10 hectares
    assert res["target_pixels"] == 1000
    assert res["coverage_percentage"] == 10.0
    assert np.isclose(res["area_sq_km"], 0.1, atol=1e-3)
    assert np.isclose(res["area_hectares"], 10.0, atol=1e-2)
    assert res["verification_audit"]["is_hallucination_proof"] is True
