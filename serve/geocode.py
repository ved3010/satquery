"""
Server-side geocoding for any location across India.
Combines a comprehensive pan-India city and hotspot index with live OpenStreetMap
Nominatim lookup (with countrycodes=in and memory caching).
"""
from __future__ import annotations

import json
import re
import urllib.parse
import urllib.request
from typing import Any

# In-memory cache for live geocoding lookups to ensure sub-millisecond repeated queries
_GEO_CACHE: dict[str, list[dict[str, Any]]] = {}

# Comprehensive pan-India city, hotspot, and regional knowledge index
INDIAN_CITIES_INDEX: list[dict[str, Any]] = [
    # Maharashtra
    {"name": "Pune Swargate", "state": "Maharashtra", "type": "Transit & Commercial Hub", "coords": [73.8567, 18.5018], "bbox": [73.82, 18.47, 73.89, 18.54]},
    {"name": "Pune Hinjawadi", "state": "Maharashtra", "type": "IT Park & Tech Corridor", "coords": [73.7380, 18.5913], "bbox": [73.70, 18.56, 73.77, 18.62]},
    {"name": "Pune Shivajinagar", "state": "Maharashtra", "type": "Civic & Transport Node", "coords": [73.8512, 18.5314], "bbox": [73.82, 18.50, 73.88, 18.56]},
    {"name": "Mumbai BKC (Bandra Kurla)", "state": "Maharashtra", "type": "Financial District", "coords": [72.8687, 19.0664], "bbox": [72.84, 19.04, 72.89, 19.09]},
    {"name": "Mumbai Nariman Point", "state": "Maharashtra", "type": "Commercial Peninsula", "coords": [72.8223, 18.9256], "bbox": [72.80, 18.90, 72.84, 18.95]},
    {"name": "Navi Mumbai", "state": "Maharashtra", "type": "Planned Metropolis", "coords": [73.0297, 19.0330], "bbox": [72.98, 18.98, 73.07, 19.08]},
    {"name": "Nagpur", "state": "Maharashtra", "type": "Central Logistics Hub", "coords": [79.0882, 21.1458], "bbox": [79.04, 21.10, 79.13, 21.19]},
    {"name": "Nashik", "state": "Maharashtra", "type": "Industrial & Agri Center", "coords": [73.7898, 19.9975], "bbox": [73.74, 19.95, 73.83, 20.04]},
    {"name": "Aurangabad (Chhatrapati Sambhajinagar)", "state": "Maharashtra", "type": "Heritage & Auto Hub", "coords": [75.3433, 19.8762], "bbox": [75.29, 19.83, 75.39, 19.92]},
    {"name": "Thane", "state": "Maharashtra", "type": "Urban Metropolis", "coords": [72.9781, 19.2183], "bbox": [72.94, 19.18, 73.02, 19.26]},

    # Karnataka
    {"name": "Bengaluru Whitefield", "state": "Karnataka", "type": "Tech Export Zone", "coords": [77.7499, 12.9698], "bbox": [77.71, 12.93, 77.78, 13.00]},
    {"name": "Bengaluru Electronic City", "state": "Karnataka", "type": "IT Innovation Zone", "coords": [77.6749, 12.8452], "bbox": [77.64, 12.81, 77.71, 12.88]},
    {"name": "Bengaluru Central (MG Road)", "state": "Karnataka", "type": "Commercial Core", "coords": [77.5946, 12.9716], "bbox": [77.56, 12.94, 77.63, 13.01]},
    {"name": "Mysuru (Mysore)", "state": "Karnataka", "type": "Heritage & Cultural Hub", "coords": [76.6394, 12.2958], "bbox": [76.59, 12.25, 76.68, 12.34]},
    {"name": "Mangaluru (Mangalore)", "state": "Karnataka", "type": "Coastal Port City", "coords": [74.8560, 12.9141], "bbox": [74.81, 12.87, 74.90, 12.96]},
    {"name": "Hubballi-Dharwad", "state": "Karnataka", "type": "Commercial Center", "coords": [75.1240, 15.3647], "bbox": [75.08, 15.32, 75.17, 15.41]},

    # Delhi NCR & North
    {"name": "New Delhi Connaught Place", "state": "Delhi", "type": "National Capital Core", "coords": [77.2167, 28.6328], "bbox": [77.18, 28.60, 77.25, 28.66]},
