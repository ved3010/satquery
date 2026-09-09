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

    # Rajasthan
    {"name": "Jaipur Walled City & Amer", "state": "Rajasthan", "type": "Pink City Heritage Center", "coords": [75.8267, 26.9124], "bbox": [75.78, 26.87, 75.86, 26.95]},
    {"name": "Jodhpur Mehrangarh", "state": "Rajasthan", "type": "Blue City & Desert Core", "coords": [73.0243, 26.2389], "bbox": [72.98, 26.19, 73.06, 26.28]},
    {"name": "Udaipur Lake Pichola", "state": "Rajasthan", "type": "Lake City & Aravalli Basin", "coords": [73.6835, 24.5764], "bbox": [73.64, 24.53, 73.72, 24.62]},
    {"name": "Kota Chambal River", "state": "Rajasthan", "type": "Education & Hydro Hub", "coords": [75.8362, 25.1800], "bbox": [75.79, 25.14, 75.88, 25.22]},
    {"name": "Jaisalmer Fort", "state": "Rajasthan", "type": "Thar Desert Golden Fortress", "coords": [70.9160, 26.9157], "bbox": [70.87, 26.87, 70.96, 26.96]},

    # Uttar Pradesh, Bihar, MP, Odisha, etc.
    {"name": "Varanasi Kashi Vishwanath Ghats", "state": "Uttar Pradesh", "type": "Sacred Ganga Riverfront", "coords": [83.0064, 25.3109], "bbox": [82.96, 25.27, 83.05, 25.35]},
    {"name": "Lucknow Hazratganj", "state": "Uttar Pradesh", "type": "Gomti River State Capital", "coords": [80.9462, 26.8467], "bbox": [80.90, 26.80, 80.99, 26.89]},
    {"name": "Kanpur", "state": "Uttar Pradesh", "type": "Ganga Basin Industrial City", "coords": [80.3319, 26.4499], "bbox": [80.28, 26.40, 80.38, 26.49]},
    {"name": "Agra Taj Mahal", "state": "Uttar Pradesh", "type": "Yamuna Heritage Monument", "coords": [78.0421, 27.1751], "bbox": [78.00, 27.13, 78.08, 27.21]},
    {"name": "Prayagraj (Allahabad) Sangam", "state": "Uttar Pradesh", "type": "Ganga-Yamuna Confluence", "coords": [81.8463, 25.4358], "bbox": [81.80, 25.39, 81.89, 25.47]},
    {"name": "Patna Ganga Riverfront", "state": "Bihar", "type": "Ancient Pataliputra Capital", "coords": [85.1376, 25.5941], "bbox": [85.09, 25.55, 85.18, 25.64]},
    {"name": "Bhopal Upper Lake", "state": "Madhya Pradesh", "type": "City of Lakes Capital", "coords": [77.4126, 23.2599], "bbox": [77.37, 23.21, 77.46, 23.30]},
    {"name": "Indore Rajwada", "state": "Madhya Pradesh", "type": "Commercial & Cleanest City", "coords": [75.8577, 22.7196], "bbox": [75.81, 22.67, 75.90, 22.76]},
    {"name": "Gwalior Fort", "state": "Madhya Pradesh", "type": "Historic Fort City", "coords": [78.1828, 26.2183], "bbox": [78.14, 26.17, 78.22, 26.26]},
    {"name": "Bhubaneswar", "state": "Odisha", "type": "Temple & IT City", "coords": [85.8245, 20.2961], "bbox": [85.78, 20.25, 85.87, 20.34]},
    {"name": "Cuttack Mahanadi", "state": "Odisha", "type": "Silver City & Mahanadi Delta", "coords": [85.8830, 20.4625], "bbox": [85.84, 20.42, 85.92, 20.50]},
    {"name": "Ranchi", "state": "Jharkhand", "type": "Chota Nagpur Plateau Capital", "coords": [85.3096, 23.3441], "bbox": [85.26, 23.30, 85.35, 23.39]},
    {"name": "Jamshedpur Tata Steel City", "state": "Jharkhand", "type": "Planned Industrial Center", "coords": [86.2029, 22.8046], "bbox": [86.16, 22.76, 86.25, 22.85]},
    {"name": "Raipur", "state": "Chhattisgarh", "type": "Mineral & Industrial Capital", "coords": [81.6296, 21.2514], "bbox": [81.58, 21.21, 81.67, 21.29]},

    # North-East, Mountains, and Islands
    {"name": "Guwahati Brahmaputra", "state": "Assam", "type": "Gateway to North-East India", "coords": [91.7362, 26.1445], "bbox": [91.69, 26.10, 91.78, 26.19]},
    {"name": "Shillong", "state": "Meghalaya", "type": "Scotland of the East Plateau", "coords": [91.8933, 25.5788], "bbox": [91.85, 25.53, 91.93, 25.62]},
    {"name": "Dehradun", "state": "Uttarakhand", "type": "Doon Valley Himalayan Foothills", "coords": [78.0322, 30.3165], "bbox": [77.99, 30.27, 78.07, 30.36]},
    {"name": "Shimla Mall Road", "state": "Himachal Pradesh", "type": "Himalayan Ridge Capital", "coords": [77.1734, 31.1048], "bbox": [77.13, 31.06, 77.21, 31.14]},
    {"name": "Srinagar Dal Lake", "state": "Jammu & Kashmir", "type": "Kashmir Valley Lake Basin", "coords": [74.7973, 34.0837], "bbox": [74.75, 34.04, 74.84, 34.12]},
    {"name": "Jammu Tawi", "state": "Jammu & Kashmir", "type": "Winter Capital & Tawi River", "coords": [74.8570, 32.7266], "bbox": [74.81, 32.68, 74.90, 32.77]},
    {"name": "Leh Ladakh", "state": "Ladakh", "type": "High Altitude Trans-Himalayas", "coords": [77.5771, 34.1526], "bbox": [77.53, 34.11, 77.62, 34.19]},
    {"name": "Port Blair", "state": "Andaman & Nicobar", "type": "Island Territory Capital", "coords": [92.7265, 11.6234], "bbox": [92.68, 11.58, 92.77, 11.66]},
]


def search_locations(query: str, limit: int = 8) -> list[dict[str, Any]]:
    """Search for locations across India using local indexing + OpenStreetMap Nominatim.
    Always returns valid coordinates and bounding boxes.
    """
    q = query.strip()
    if not q:
        return INDIAN_CITIES_INDEX[:limit]

    # Check direct GPS coordinates (e.g. '18.52, 73.85' or '73.85, 18.52')
    coord_match = re.match(r"^([-+]?\d{1,2}(?:\.\d+)?)[,\s]+([-+]?\d{1,3}(?:\.\d+)?)$", q)
    if coord_match:
        p1 = float(coord_match.group(1))
        p2 = float(coord_match.group(2))
        lat, lon = p1, p2
        if abs(p1) > 90 and abs(p2) <= 90:
            lon, lat = p1, p2
        return [{
            "name": f"Coordinates ({lat:.4f}°N, {lon:.4f}°E)",
            "state": "India",
            "country": "India",
            "type": "Custom Target Coordinates",
            "coords": [round(lon, 4), round(lat, 4)],
            "bbox": [round(lon - 0.02, 4), round(lat - 0.02, 4), round(lon + 0.02, 4), round(lat + 0.02, 4)],
        }]

    q_lower = q.lower()
    if q_lower in _GEO_CACHE:
        return _GEO_CACHE[q_lower]

    # 1. High-precision local database matches (instant < 1ms)
    matches = []
    for item in INDIAN_CITIES_INDEX:
        name_l = item["name"].lower()
        state_l = item["state"].lower()
        type_l = item["type"].lower()
        if q_lower in name_l or q_lower in state_l or q_lower in type_l:
            score = 100 if name_l.startswith(q_lower) else (80 if q_lower in name_l else 50)
            matches.append((score, item))

    matches.sort(key=lambda x: x[0], reverse=True)
    results = [m[1] for m in matches]

    # If we have at least 4 strong matches, return immediately
    if len(results) >= 4:
        _GEO_CACHE[q_lower] = results[:limit]
        return results[:limit]

    # 2. Server-side OpenStreetMap Nominatim with India bias
    try:
        encoded = urllib.parse.quote(q)
        url = f"https://nominatim.openstreetmap.org/search?format=json&q={encoded}&countrycodes=in&addressdetails=1&limit={limit}"
        req = urllib.request.Request(url, headers={
            "User-Agent": "SatQuery-PanIndia-AI/1.0",
            "Accept-Language": "en"
        })
        with urllib.request.urlopen(req, timeout=4) as resp:
            data = json.loads(resp.read().decode())
            for item in data:
                lat = float(item["lat"])
                lon = float(item["lon"])
                bb = [float(x) for x in item.get("boundingbox", [lat - 0.02, lat + 0.02, lon - 0.02, lon + 0.02])]
                south, north, west, east = bb[0], bb[1], bb[2], bb[3]
                display_name = item.get("display_name", "")
                parts = [p.strip() for p in display_name.split(",") if p.strip()]
                name = parts[0] if parts else q.title()
                state = item.get("address", {}).get("state", parts[-2] if len(parts) >= 2 else "India")
                place_type = item.get("type", "Urban Location").replace("_", " ").title()

                candidate = {
                    "name": name,
                    "state": state,
                    "country": "India",
                    "type": f"{place_type} · {state}",
                    "coords": [round(lon, 5), round(lat, 5)],
                    "bbox": [round(west, 5), round(south, 5), round(east, 5), round(north, 5)],
                }
                # Avoid duplicates
                if not any(abs(r["coords"][0] - lon) < 0.03 and abs(r["coords"][1] - lat) < 0.03 for r in results):
                    results.append(candidate)
    except Exception:
        pass

    final_results = results[:limit] if results else INDIAN_CITIES_INDEX[:limit]
    _GEO_CACHE[q_lower] = final_results
    return final_results
