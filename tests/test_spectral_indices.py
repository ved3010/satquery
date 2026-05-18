"""
Unit tests for spectral indices and land-cover classification.
"""
import unittest
import numpy as np
from serve.analysis import _ratio, CLASSES


class TestSpectralIndices(unittest.TestCase):
    def test_ratio_normal(self):
        a = np.array([0.8, 0.5])
        b = np.array([0.2, 0.5])
        res = _ratio(a, b)
        self.assertTrue(np.isclose(res[0], 0.6))
        self.assertTrue(np.isclose(res[1], 0.0))

    def test_ratio_zero_denominator(self):
        a = np.array([0.0, -0.5])
        b = np.array([0.0, 0.5])
        res = _ratio(a, b)
        self.assertTrue(np.all(np.isfinite(res)))
