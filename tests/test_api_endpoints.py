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
        response = self.client.get("/")
        self.assertEqual(response.status_code, 200)
        self.assertIn("text/html", response.headers["content-type"])

    def test_health_endpoint(self):
        response = self.client.get("/health")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["status"], "ok")
        self.assertEqual(data["models_registered"], 8)
        self.assertIn("M-2 single-image VQA", data["mandatory_coverage"])

    def test_models_endpoint(self):
        response = self.client.get("/models")
        self.assertEqual(response.status_code, 200)
