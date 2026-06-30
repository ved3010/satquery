"""
API Integration tests for SatQuery FastAPI service.
"""
import unittest
from fastapi.testclient import TestClient
from serve.api import app


class TestApiEndpoints(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)

    def test_root_endpoint(self):
