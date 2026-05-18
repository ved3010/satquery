"""
Unit tests for spectral indices and land-cover classification.
"""
import unittest
import numpy as np
from serve.analysis import _ratio, CLASSES


class TestSpectralIndices(unittest.TestCase):
    def test_ratio_normal(self):
