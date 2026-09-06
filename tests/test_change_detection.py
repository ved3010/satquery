import numpy as np
from satquery.tools.change_detection import ChangeDetectionTool


def test_bitemporal_change_detection():
    tool = ChangeDetectionTool()
    grid_size = 100
    
    # T1: High vegetation (0.8 everywhere)
    t1 = np.full((grid_size, grid_size), 0.8)
    
    # T2: 25% area deforested (0.2 in top-left quadrant, 0.8 elsewhere)
    t2 = t1.copy()
    t2[:50, :50] = 0.2
    
    res = tool.run(raster_t1=t1, raster_t2=t2, metric="NDVI", sensitivity=0.15)
    
    stats = res["statistics"]
    assert stats["total_pixels"] == 10000
    assert stats["loss_pixels"] == 2500
    assert stats["loss_percentage"] == 25.0
    assert stats["stable_percentage"] == 75.0
    assert np.isclose(stats["max_decrease"], -0.6, atol=1e-3)
