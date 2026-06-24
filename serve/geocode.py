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
    {"name": "Delhi Dwarka", "state": "Delhi", "type": "Sub-City Residential Hub", "coords": [77.0500, 28.5921], "bbox": [77.01, 28.55, 77.09, 28.63]},
    {"name": "Gurugram (Gurgaon) Cyber City", "state": "Haryana", "type": "Corporate HQ Corridor", "coords": [77.0888, 28.4950], "bbox": [77.05, 28.46, 77.12, 28.53]},
    {"name": "Noida Sector 62", "state": "Uttar Pradesh", "type": "Institutional & Tech Zone", "coords": [77.3649, 28.6270], "bbox": [77.32, 28.59, 77.40, 28.66]},
    {"name": "Greater Noida", "state": "Uttar Pradesh", "type": "Planned Industrial City", "coords": [77.5040, 28.4744], "bbox": [77.46, 28.43, 77.55, 28.52]},
    {"name": "Chandigarh Sector 17", "state": "Chandigarh", "type": "Union Territory Capital", "coords": [76.7794, 30.7333], "bbox": [76.74, 30.69, 76.82, 30.77]},

    # Gujarat
    {"name": "Ahmedabad Sabarmati Riverfront", "state": "Gujarat", "type": "Urban Riverfront & Metropolis", "coords": [72.5714, 23.0225], "bbox": [72.53, 22.98, 72.61, 23.06]},
    {"name": "GIFT City (Gandhinagar)", "state": "Gujarat", "type": "International Financial TEC-City", "coords": [72.6842, 23.1606], "bbox": [72.64, 23.12, 72.72, 23.20]},
    {"name": "Surat Diamond Bourse", "state": "Gujarat", "type": "Textile & Diamond Hub", "coords": [72.8311, 21.1702], "bbox": [72.79, 21.13, 72.87, 21.21]},
    {"name": "Vadodara", "state": "Gujarat", "type": "Cultural & Chemical Hub", "coords": [73.1812, 22.3072], "bbox": [73.14, 22.26, 73.22, 22.34]},
    {"name": "Rajkot", "state": "Gujarat", "type": "Engineering & Industrial Zone", "coords": [70.8022, 22.3039], "bbox": [70.76, 22.26, 70.84, 22.34]},

    # Telangana & Andhra Pradesh
    {"name": "Hyderabad HITEC City", "state": "Telangana", "type": "Cyberabad Tech Hub", "coords": [78.3728, 17.4474], "bbox": [78.33, 17.41, 78.41, 17.48]},
    {"name": "Hyderabad Gachibowli", "state": "Telangana", "type": "Financial & Stadium District", "coords": [78.3489, 17.4401], "bbox": [78.31, 17.40, 78.38, 17.47]},
    {"name": "Hyderabad Charminar", "state": "Telangana", "type": "Old City Heritage Zone", "coords": [78.4747, 17.3616], "bbox": [78.44, 17.33, 78.50, 17.39]},
    {"name": "Visakhapatnam Port & Beach", "state": "Andhra Pradesh", "type": "Eastern Coastal Port", "coords": [83.2185, 17.6868], "bbox": [83.17, 17.65, 83.26, 17.73]},
    {"name": "Vijayawada", "state": "Andhra Pradesh", "type": "Commercial & Krishna River Hub", "coords": [80.6480, 16.5062], "bbox": [80.60, 16.46, 80.69, 16.55]},
    {"name": "Tirupati", "state": "Andhra Pradesh", "type": "Temple & Spiritual City", "coords": [79.4192, 13.6288], "bbox": [79.37, 13.58, 79.46, 13.67]},

    # Tamil Nadu
    {"name": "Chennai OMR IT Corridor", "state": "Tamil Nadu", "type": "Expressway Tech Hub", "coords": [80.2279, 12.9249], "bbox": [80.19, 12.88, 80.26, 12.96]},
    {"name": "Chennai Marina Beach", "state": "Tamil Nadu", "type": "Coastal Bay of Bengal", "coords": [80.2824, 13.0500], "bbox": [80.25, 13.01, 80.31, 13.09]},
    {"name": "Coimbatore", "state": "Tamil Nadu", "type": "Textile & Manufacturing Core", "coords": [76.9558, 11.0168], "bbox": [76.91, 10.97, 77.00, 11.06]},
    {"name": "Madurai", "state": "Tamil Nadu", "type": "Temple & Cultural Center", "coords": [78.1198, 9.9252], "bbox": [78.07, 9.88, 78.16, 9.97]},
    {"name": "Tiruchirappalli (Trichy)", "state": "Tamil Nadu", "type": "Cauvery River Industrial Hub", "coords": [78.7047, 10.7905], "bbox": [78.66, 10.75, 78.75, 10.83]},

    # Kerala
    {"name": "Kochi Marine Drive & Port", "state": "Kerala", "type": "Coastal Port & Backwaters", "coords": [76.2711, 9.9816], "bbox": [76.23, 9.94, 76.31, 10.02]},
    {"name": "Thiruvananthapuram (Trivandrum)", "state": "Kerala", "type": "State Capital & Technopark", "coords": [76.9366, 8.5241], "bbox": [76.89, 8.48, 76.98, 8.57]},
    {"name": "Kozhikode (Calicut)", "state": "Kerala", "type": "Malabar Coastal Port", "coords": [75.7804, 11.2588], "bbox": [75.74, 11.21, 75.82, 11.30]},

    # West Bengal & East
    {"name": "Kolkata New Town Eco Park", "state": "West Bengal", "type": "Smart City & Wetland Buffer", "coords": [88.4646, 22.6074], "bbox": [88.42, 22.56, 88.50, 22.64]},
    {"name": "Kolkata Park Street & Hooghly", "state": "West Bengal", "type": "Historic Colonial Core", "coords": [88.3512, 22.5517], "bbox": [88.31, 22.51, 88.39, 22.59]},
    {"name": "Howrah Station & Bridge", "state": "West Bengal", "type": "Railway & River Terminal", "coords": [88.3426, 22.5855], "bbox": [88.30, 22.54, 88.38, 22.62]},
    {"name": "Durgapur", "state": "West Bengal", "type": "Steel & Heavy Industrial Hub", "coords": [87.3119, 23.5204], "bbox": [87.27, 23.48, 87.35, 23.56]},
    {"name": "Siliguri", "state": "West Bengal", "type": "Corridor to North-East", "coords": [88.4352, 26.7271], "bbox": [88.39, 26.68, 88.47, 26.77]},

