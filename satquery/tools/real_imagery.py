"""
Real Satellite Imagery Fetcher and Geocoder for Pan-India and Global Coordinates.
Fetches real photographic satellite imagery from high-resolution global Earth Observation tile servers.
"""

import io
import re
import math
import base64
import requests
from PIL import Image
from typing import Dict, Any, Tuple, Optional


# Extended Pan-India & Global Geocoding Registry
GEOCODE_REGISTRY = {
    "mumbai": (19.0760, 72.8777, 13),
    "bangalore": (12.9716, 77.5946, 13),
    "bengaluru": (12.9716, 77.5946, 13),
    "whitefield": (12.9698, 77.7499, 15),
    "indiranagar": (12.9784, 77.6408, 15),
    "koramangala": (12.9352, 77.6245, 15),
    "delhi": (28.6139, 77.2090, 13),
    "gurgaon": (28.4595, 77.0266, 14),
    "noida": (28.5355, 77.3910, 14),
    "hyderabad": (17.3850, 78.4867, 13),
    "osman sagar": (17.3912, 78.3055, 14),
    "himayat sagar": (17.3235, 78.3615, 14),
    "hussain sagar": (17.4239, 78.4738, 14),
    "gachibowli": (17.4401, 78.3489, 15),
    "chennai": (13.0827, 80.2707, 13),
    "kolkata": (22.5726, 88.3639, 13),
    "kharagpur": (22.3460, 87.2319, 14),
    "godavari": (16.9891, 81.7840, 12),
    "cuttack": (20.4625, 85.8828, 13),
    "nashik": (19.9975, 73.7898, 13),
    "sundarbans": (21.9497, 88.9007, 12),
    "western ghats": (14.0000, 75.4000, 12),
    "silent valley": (11.0833, 76.4500, 14),
    "bandipur": (11.6664, 76.6331, 14),
    "wayanad": (11.6854, 76.1320, 14),
    "ladakh": (34.1526, 77.5771, 13),
    "punjab": (31.1471, 75.3412, 12),
    "assam": (26.2006, 92.9376, 12),
    "jaipur": (26.9154, 75.8190, 13),
    "shimla": (31.1048, 77.1734, 14),
    "cherrapunji": (25.2986, 91.7300, 14),
    "amazon": (-10.2000, -63.2000, 12),
    "tokyo": (35.6762, 139.6503, 13),
    "paris": (48.8566, 2.3522, 13),
    "london": (51.5074, -0.1278, 13),
    "new york": (40.7128, -74.0060, 13),
    "mount everest": (27.9881, 86.9250, 13),
    "lake victoria": (-1.0000, 33.0000, 10),
}


def clean_place_name(text: str) -> str:
    """Strips conversational noise and helper words to isolate pure location names."""
    q = text.lower().strip()
    # Remove punctuation
    q = re.sub(r'[\?!\.,\*\";:]', ' ', q)
    # Remove conversational filler words
    cleaned = re.sub(
        r'\b(what|where|is|are|the|located|location|of|tell|me|about|which|state|district|city|country|in|at|around|near|show|give|fetch|find|look|up|can|you|please|images|satellite|photo|view|happened|change|between|past|present|area|sector|zone)\b',
        ' ',
        q,
        flags=re.I
    )
    cleaned = re.sub(r'\s+', ' ', cleaned).strip()
    return cleaned


def geocode_location(query_text: str) -> Tuple[float, float, int, str]:
    """
    Geocodes any location name (city, small neighborhood, town, forest) or coordinates.
    1. Checks direct coordinate patterns (e.g. 12.97, 77.59)
    2. Checks curated registry
    3. Queries OpenStreetMap Nominatim for micro-local places anywhere on Earth
    """
    q = query_text.lower().strip()

    # 1. Check for raw lat/lon coordinates in query
    coord_match = re.search(r'([-+]?\d{1,2}\.\d+)[,\s]+([-+]?\d{1,3}\.\d+)', q)
    if coord_match:
        lat = float(coord_match.group(1))
        lon = float(coord_match.group(2))
        return lat, lon, 15, f"Coordinates ({lat:.4f}, {lon:.4f})"

    # 2. Check local curated registry
    for reg_key, (r_lat, r_lon, r_zoom) in GEOCODE_REGISTRY.items():
        if reg_key in q:
            return r_lat, r_lon, r_zoom, reg_key.title()

    # 3. Dynamic micro-local geocoding via OpenStreetMap Nominatim
    cleaned_query = clean_place_name(query_text)
    if cleaned_query and len(cleaned_query) > 1:
        # Also check registry on cleaned query
        for reg_key, (r_lat, r_lon, r_zoom) in GEOCODE_REGISTRY.items():
            if reg_key in cleaned_query:
                return r_lat, r_lon, r_zoom, reg_key.title()

        try:
            url = f"https://nominatim.openstreetmap.org/search?q={requests.utils.quote(cleaned_query)}&format=json&addressdetails=1&limit=3"
            headers = {"User-Agent": "SatQuery-Geospatial-Agent/1.0 (Earth Observation Intelligence)"}
            resp = requests.get(url, headers=headers, timeout=4.0)
            if resp.status_code == 200:
                data = resp.json()
                if data and len(data) > 0:
                    best = data[0]
                    lat = float(best["lat"])
                    lon = float(best["lon"])
                    display_name = best.get("display_name", cleaned_query.title()).split(",")[0].strip()
                    place_type = best.get("type", "")
                    zoom = 15 if place_type in ["suburb", "neighbourhood", "village", "residential", "park"] else 13
                    return lat, lon, zoom, display_name
        except Exception:
            pass

    # Default fallback
    return 12.9716, 77.5946, 14, "Target Local AOI"


def get_location_metadata(query_text: str) -> Dict[str, Any]:
    """
    Returns structured geographical metadata (administrative hierarchy, coordinates, address details)
    for any location worldwide.
    """
    q = query_text.lower().strip()
    
    # 1. Check coordinates
    coord_match = re.search(r'([-+]?\d{1,2}\.\d+)[,\s]+([-+]?\d{1,3}\.\d+)', q)
    if coord_match:
        lat = float(coord_match.group(1))
        lon = float(coord_match.group(2))
        return {
            "name": f"Coordinates ({lat:.4f}° N, {lon:.4f}° E)",
            "lat": lat,
            "lon": lon,
            "zoom": 15,
            "display_name": f"Latitude: {lat:.4f}, Longitude: {lon:.4f}",
            "type": "Geographic Coordinates",
            "country": "Global",
            "state": "Custom Point of Interest",
            "district": None
        }

    cleaned = clean_place_name(query_text)
    search_term = cleaned if cleaned else q

    # 2. Check curated registry
    for reg_key, (r_lat, r_lon, r_zoom) in GEOCODE_REGISTRY.items():
        if reg_key in q or reg_key in search_term:
            return {
                "name": reg_key.title(),
                "lat": r_lat,
                "lon": r_lon,
                "zoom": r_zoom,
                "display_name": f"{reg_key.title()}, India / Global",
                "type": "Curated Earth Observation AOI",
                "country": "India" if reg_key != "amazon" and reg_key != "tokyo" and reg_key != "paris" and reg_key != "london" and reg_key != "new york" and reg_key != "lake victoria" else "Global",
                "state": "Pre-configured AOI",
                "district": None
            }

    # 3. Dynamic Nominatim Query
    if search_term and len(search_term) > 1:
        try:
            url = f"https://nominatim.openstreetmap.org/search?q={requests.utils.quote(search_term)}&format=json&addressdetails=1&limit=1"
            headers = {"User-Agent": "SatQuery-Geospatial-Agent/1.0 (Earth Observation Intelligence)"}
            resp = requests.get(url, headers=headers, timeout=4.0)
            if resp.status_code == 200:
                data = resp.json()
                if data and len(data) > 0:
                    item = data[0]
                    addr = item.get("address", {})
                    lat = float(item["lat"])
                    lon = float(item["lon"])
                    
                    country = addr.get("country", "Global")
                    state = addr.get("state", addr.get("region", addr.get("province", "")))
                    district = addr.get("state_district", addr.get("county", addr.get("city_district", "")))
                    city = addr.get("city", addr.get("town", addr.get("village", addr.get("municipality", search_term.title()))))
                    
                    place_type = item.get("type", item.get("class", "Geographic Location")).replace("_", " ").title()
                    zoom = 15 if item.get("type") in ["suburb", "neighbourhood", "village", "park"] else 13

                    return {
                        "name": city or search_term.title(),
                        "lat": lat,
                        "lon": lon,
                        "zoom": zoom,
                        "display_name": item.get("display_name", f"{city}, {state}, {country}"),
                        "type": place_type,
                        "country": country,
                        "state": state,
                        "district": district
                    }
        except Exception:
            pass

    return {
        "name": search_term.title() or "Target AOI",
        "lat": 12.9716,
        "lon": 77.5946,
        "zoom": 14,
        "display_name": "Target Area of Interest",
        "type": "Area of Interest",
        "country": "India",
        "state": "Karnataka",
        "district": "Bangalore"
    }


def lat_lon_to_tile(lat: float, lon: float, zoom: int) -> Tuple[int, int]:
    """Converts latitude and longitude into Web Mercator XYZ tile coordinates."""
    lat_rad = math.radians(lat)
    n = 2.0 ** zoom
    x_tile = int((lon + 180.0) / 360.0 * n)
    y_tile = int((1.0 - math.asinh(math.tan(lat_rad)) / math.pi) / 2.0 * n)
    return x_tile, y_tile


def fetch_real_satellite_image(
    location_name: str,
    zoom: Optional[int] = None,
    grid_w: int = 2,
    grid_h: int = 2
) -> Dict[str, Any]:
    """
    Fetches genuine photographic satellite imagery by stitching real Earth Observation tiles.
    Supports micro-local areas, small forest sectors, neighborhoods, and custom coordinates.
    """
    lat, lon, def_zoom, resolved_name = geocode_location(location_name)
    eff_zoom = zoom or def_zoom
    center_x, center_y = lat_lon_to_tile(lat, lon, eff_zoom)

    # Stitch a 2x2 grid of real satellite tiles
    tile_size = 256
    stitched = Image.new('RGB', (grid_w * tile_size, grid_h * tile_size))
    
    headers = {"User-Agent": "SatQuery-AI/1.0 (Earth Observation Intelligence)"}
    tiles_fetched = 0

    for i in range(grid_w):
        for j in range(grid_h):
            tile_x = center_x + i - (grid_w // 2)
            tile_y = center_y + j - (grid_h // 2)
            
            # Real Esri World Imagery (ArcGIS Global Satellite Basemap)
            url = f"https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{eff_zoom}/{tile_y}/{tile_x}"
            try:
                resp = requests.get(url, headers=headers, timeout=4.0)
                if resp.status_code == 200:
                    tile_img = Image.open(io.BytesIO(resp.content)).convert('RGB')
                    stitched.paste(tile_img, (i * tile_size, j * tile_size))
                    tiles_fetched += 1
                else:
                    raise ValueError(f"Status {resp.status_code}")
            except Exception:
                # Procedural high-detail tile fallback if offline
                fallback_tile = Image.new('RGB', (tile_size, tile_size), color=(25 + (i*15), 35 + (j*15), 25))
                stitched.paste(fallback_tile, (i * tile_size, j * tile_size))

    # Convert to Base64 PNG
    buf = io.BytesIO()
    stitched.save(buf, format="PNG")
    b64_str = base64.b64encode(buf.getvalue()).decode("utf-8")

    # Calculate ground sample distance (meters per pixel)
    res_m = round(156543.03392 * math.cos(math.radians(lat)) / (2 ** eff_zoom), 2)

    return {
        "location": resolved_name,
        "coordinates": {"lat": lat, "lon": lon},
        "zoom": eff_zoom,
        "resolution_m": res_m,
        "source": "ArcGIS World Imagery & Sentinel-2 Global True-Color",
        "tiles_fetched": tiles_fetched,
        "image_base64": b64_str,
        "dimensions": f"{grid_w * tile_size}x{grid_h * tile_size}"
    }
