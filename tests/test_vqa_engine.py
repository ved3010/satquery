"""Tests for SatQuery RSVQAEngine (Visual Question Answering & Multi-Spectral Grounding)."""

import pytest
import numpy as np
from PIL import Image
from satquery.models.vqa_engine import RSVQAEngine, BIGEARTHNET_CLASSES

def create_synthetic_image():
    # 256x256 image with green vegetation top, water bottom-left, urban bottom-right
    arr = np.zeros((256, 256, 3), dtype=np.uint8)
    # Green forest
    arr[:128, :, 1] = 200
    arr[:128, :, 0] = 50
    arr[:128, :, 2] = 50
    # Water
    arr[128:, :128, 2] = 180
    arr[128:, :128, 0] = 20
    arr[128:, :128, 1] = 40
    # Urban
    arr[128:, 128:, :] = 190

    return Image.fromarray(arr)

def test_vqa_engine_initialization():
    engine = RSVQAEngine()
    assert len(engine.classes) == 19
    assert "Broad-leaved forest" in engine.classes
    assert "Water bodies" in engine.classes

def test_vqa_land_cover_query():
    engine = RSVQAEngine()
    img = create_synthetic_image()
    
    res = engine.analyze_vqa(
        image_pil=img,
        question="What is the dominant land cover class in this satellite image?",
        coordinates={"lat": 12.9716, "lon": 77.5946},
        zoom_level=14
    )
    
    assert "answer" in res
    assert "question_type" in res
    assert res["question_type"] == "scene_understanding_vqa"
    assert "bigearthnet_class_distribution" in res
    assert len(res["bigearthnet_class_distribution"]) > 0
    assert "spatial_metadata" in res
    assert res["spatial_metadata"]["scene_area_hectares"] > 0

def test_vqa_deforestation_query():
    engine = RSVQAEngine()
    img = create_synthetic_image()
    
    res = engine.analyze_vqa(
        image_pil=img,
        question="Is there deforestation or forest loss visible in this area?",
        coordinates={"lat": 11.13, "lon": 76.45},
        zoom_level=14
    )
    
    assert "answer" in res
    assert res["question_type"] == "deforestation_change_vqa"
    assert "biophysical_metrics" in res
    assert res["biophysical_metrics"]["is_deforestation"] is True
    assert res["biophysical_metrics"]["impact_area_hectares"] > 0
    assert len(res["grounded_bounding_boxes"]) > 0

def test_vqa_urban_query():
    engine = RSVQAEngine()
    img = create_synthetic_image()
    
    res = engine.analyze_vqa(
        image_pil=img,
        question="What is the urban development or built-up expansion here?",
        coordinates={"lat": 12.97, "lon": 77.59},
        zoom_level=14
    )
    
    assert "answer" in res
    assert res["question_type"] == "urban_change_vqa"
    assert res["biophysical_metrics"]["is_deforestation"] is False
    assert len(res["grounded_bounding_boxes"]) > 0
