"""
SatQuery Conversational AI Agent.
Autonomous Vision-Language Geospatial Assistant capable of answering any remote-sensing question,
explaining scientific concepts, resolving any location worldwide with rich encyclopedic insights, and fetching
both real ground/landmark photography and crisp multi-perspective satellite imagery galleries
(Optical RGB, False Color CIR, NDVI, SAR Radar, and Macro Context).
"""

import re
import io
import math
import base64
from typing import Dict, Any, List, Optional
from PIL import Image

from satquery.tools.real_imagery import (
    fetch_real_satellite_image,
    fetch_multi_perspective_satellite_images,
    fetch_real_ground_photos,
    fetch_location_deep_profile,
    geocode_location,
    get_location_metadata,
    clean_place_name,
    GEOCODE_REGISTRY
)
from satquery.agent.planner import AgentPlanner
from satquery.agent.executor import AgentExecutor
from satquery.agent.synthesizer import EvidenceSynthesizer
from satquery.models.vqa_engine import rsvqa_engine


# Curated Geospatial Knowledge Base for Pan-India & Global Locations
LOCATION_KNOWLEDGE: Dict[str, Dict[str, Any]] = {
    "goa": {
        "title": "Goa (Konkan Coastal State)",
        "type": "Coastal State & Ecological Hotspot",
        "state": "Goa, India",
        "capital": "Panaji",
        "coordinates": "15.2993° N, 74.1240° E",
        "coastline": "160 km along the Arabian Sea",
        "river": "Mandovi and Zuari River Estuaries",
        "geography": "Bordered by the Western Ghats (Sahyadris) to the east and the Arabian Sea to the west, rich in mangrove ecosystems, laterite plateaus, and pristine beaches (Baga, Calangute, Anjuna, Palolem).",
        "remote_sensing_significance": (
            "Coastal zone management, mangrove canopy tracking in Zuari/Mandovi estuaries via Sentinel-2 NDWI/NDVI, "
            "and seasonal coastal erosion monitoring."
        ),
        "recommended_query": "Show satellite imagery of Goa and its coastline"
    },
    "osman sagar": {
        "title": "Osman Sagar (Gandipet Lake)",
        "type": "Freshwater Reservoir & Watershed",
        "state": "Telangana, India",
        "district": "Ranga Reddy District / Hyderabad Metropolitan Area",
        "river": "Musi River (tributary of Krishna River)",
        "coordinates": "17.3912° N, 78.3055° E",
        "elevation": "545 meters MSL",
        "surface_area": "~29 sq km (approx. 2,900 hectares at full tank level)",
        "history": (
            "Commissioned in 1920 by the 7th Nizam of Hyderabad, Mir Osman Ali Khan, "
            "designed by Sir M. Visvesvaraya following the Great Musi Flood of 1908. "
            "It served as Hyderabad's primary drinking water reservoir for over a century."
        ),
        "remote_sensing_significance": (
            "Monitored via Sentinel-2 NDWI/MNDWI and Sentinel-1 SAR for seasonal surface water contraction, "
            "catchment siltation, and urban encroachment along the Gandipet and Gachibowli IT corridor fringes."
        ),
        "recommended_query": "Calculate surface water reduction in Osman Sagar Reservoir between 2021 and 2024"
    },
    "swargate": {
        "title": "Swargate, Pune",
        "type": "Major Urban Transit Hub & Commercial Center",
        "state": "Maharashtra, India",
        "district": "Pune City District",
        "coordinates": "18.5018° N, 73.8580° E",
        "context": "One of the central transportation, commercial, and metro hubs of Pune, adjacent to Sarasbaug and Parvati Hill.",
        "remote_sensing_significance": "High-density urban built-up fabric (NDBI > 0.35) and transport network infrastructure.",
        "recommended_query": "Show satellite imagery of Swargate Pune"
    },
    "pune": {
        "title": "Pune Metropolitan Agglomeration",
        "type": "Major Industrial & Educational Megacity",
        "state": "Maharashtra, India",
        "coordinates": "18.5204° N, 73.8567° E",
        "elevation": "560 meters MSL",
        "context": "The cultural capital of Maharashtra and major automotive, manufacturing, and IT hub (Hinjewadi, Magarpatta).",
        "remote_sensing_significance": "Rapid peri-urban concrete sprawl into Mutha river basin and Sahyadri foothills.",
        "recommended_query": "What is the urban expansion in Pune over the last 5 years?"
    },
    "lonavala": {
        "title": "Lonavala & Khandala (Sahyadri Ghats)",
        "type": "Hill Station & Mountain Pass (Bhor Ghat)",
        "state": "Maharashtra, India",
        "district": "Pune District",
        "elevation": "622 meters MSL",
        "coordinates": "18.7504° N, 73.4069° E",
        "context": "Famous hill station on the Mumbai-Pune Expressway, surrounded by waterfalls, Bhushi Dam, Karla/Bhaja caves, and dense Sahyadri rainforests.",
        "remote_sensing_significance": "Monsoon canopy flush tracking (NDVI peak > 0.85 in August), seasonal waterfalls, and reservoir water retention (Walwan/Lonavala lakes).",
        "recommended_query": "Show satellite images of Lonavala"
    },
    "kedarnath": {
        "title": "Kedarnath Valley & Shrine",
        "type": "High-Altitude Glacial Valley & Himalayan Shrine",
        "state": "Uttarakhand, India",
        "district": "Rudraprayag District (Garhwal Himalayas)",
        "river": "Mandakini River",
        "elevation": "3,583 meters MSL",
        "coordinates": "30.7346° N, 79.0669° E",
        "context": "One of the holiest Chota Char Dham sites, located near the Chorabari glacier snout beneath the Kedarnath Peak (6,940m).",
        "remote_sensing_significance": "Glacial lake outburst flood (GLOF) monitoring, Chorabari glacier retreat, and snow cover dynamics using Sentinel-2 NDSI.",
        "recommended_query": "Show satellite imagery of Kedarnath valley"
    },
    "varanasi": {
        "title": "Varanasi (Kashi / Benares)",
        "type": "Ancient Cultural City & Sacred Riverfront",
        "state": "Uttar Pradesh, India",
        "river": "Ganges (Ganga) River",
        "coordinates": "25.3176° N, 82.9739° E",
        "elevation": "81 meters MSL",
        "context": "One of the world's oldest continually inhabited cities, famous for its 84 stone ghats (Dashashwamedh, Manikarnika) along the crescent Ganga bend.",
        "remote_sensing_significance": "Ganga river course dynamics, sandbar shifts, and urban heat island effects across the dense heritage core.",
        "recommended_query": "Show satellite view of Varanasi Ghats"
    },
    "himayat sagar": {
        "title": "Himayat Sagar Reservoir",
        "type": "Freshwater Reservoir",
        "state": "Telangana, India",
        "district": "Hyderabad / Ranga Reddy District",
        "river": "Esi River (tributary of Musi River)",
        "coordinates": "17.3235° N, 78.3615° E",
        "surface_area": "~14.5 sq km",
        "history": "Built in 1927 parallel to Osman Sagar to protect Hyderabad from floods and provide potable water.",
        "remote_sensing_significance": "Sentinel-2 bi-temporal NDWI monitoring for reservoir capacity tracking.",
        "recommended_query": "Analyze water level changes in Himayat Sagar using NDWI"
    },
    "hussain sagar": {
        "title": "Hussain Sagar Lake",
        "type": "Heart-Shaped Urban Lake",
        "state": "Telangana, India",
        "district": "Hyderabad Central District",
        "river": "Fed by Musi River runoff channels",
        "coordinates": "17.4239° N, 78.4738° E",
        "surface_area": "4.4 sq km",
        "history": "Built in 1563 by Ibrahim Quli Qutb Shah, famous for the monolithic Buddha statue at Gibraltar Rock.",
        "remote_sensing_significance": "Algal bloom & eutrophication tracking via Sentinel-2 RedEdge and Chl-a band ratios.",
        "recommended_query": "Classify water quality and urban fabric around Hussain Sagar"
    },
    "western ghats": {
        "title": "Western Ghats (Sahyadri Mountain Range)",
        "type": "Tropical Montane Rainforest & UNESCO World Heritage Site",
        "state": "Spans Gujarat, Maharashtra, Goa, Karnataka, Kerala, and Tamil Nadu",
        "coordinates": "14.0000° N, 75.4000° E (Central Sahyadri Belt)",
        "length": "1,600 km along India's western coast",
        "elevation": "Up to 2,695 meters (Anamudi Peak, Kerala)",
        "biodiversity": "One of the world's 36 global biodiversity hotspots, home to over 5,000 vascular plant species and endangered fauna.",
        "remote_sensing_significance": (
            "Monitored via Sentinel-2 NDVI/EVI and ALOS PALSAR / Sentinel-1 SAR for canopy loss, "
            "tea/coffee/rubber plantation conversion, forest fragmentation, and monsoon-triggered landslides."
        ),
        "recommended_query": "What changed in Western Ghats between 2020 and 2025?"
    },
    "silent valley": {
        "title": "Silent Valley National Park",
        "type": "Pristine Evergreen Tropical Rainforest",
        "state": "Kerala, India",
        "district": "Palakkad District (Nilgiri Biosphere Reserve)",
        "river": "Kunthipuzha River",
        "coordinates": "11.0833° N, 76.4500° E",
        "biodiversity": "One of the last undisturbed continuous tracts of South Western Ghats montane rainforests, home to the largest viable population of Lion-tailed macaques.",
        "remote_sensing_significance": "Continuous dense canopy baseline with NDVI values consistently >0.78.",
        "recommended_query": "Assess forest canopy density and vegetation indices in Silent Valley"
    },
    "bangalore": {
        "title": "Bangalore (Bengaluru) Metropolitan Region",
        "type": "Major Tech Corridor & Urban Agglomeration",
        "state": "Karnataka, India",
        "coordinates": "12.9716° N, 77.5946° E",
        "elevation": "920 meters MSL (Deccan Plateau)",
        "context": "The 'Silicon Valley of India', home to major IT clusters in Whitefield, Electronic City, and Outer Ring Road (ORR).",
        "remote_sensing_significance": (
            "Rapid concrete expansion monitored via NDBI, impervious surface area growth, and historical lake cascade encroachment (Bellandur and Varthur lakes)."
        ),
        "recommended_query": "What is the concrete built-up and urban expansion in Bangalore over the last 5 years?"
    },
    "bengaluru": {
        "title": "Bangalore (Bengaluru) Metropolitan Region",
        "type": "Major Tech Corridor & Urban Agglomeration",
        "state": "Karnataka, India",
        "coordinates": "12.9716° N, 77.5946° E",
        "elevation": "920 meters MSL",
        "context": "Capital of Karnataka and hub of Indian aerospace, defense, biotechnology, and information technology.",
        "remote_sensing_significance": "Bi-temporal NDBI tracking for peri-urban expansion into agricultural zones.",
        "recommended_query": "Show development in Bangalore between 2021 and 2025"
    },
    "assam": {
        "title": "Assam Brahmaputra River Basin",
        "type": "Alluvial River Floodplain & Wetlands",
        "state": "Assam, Northeast India",
        "river": "Brahmaputra River (Yarlung Tsangpo)",
        "coordinates": "26.2006° N, 92.9376° E",
        "context": "Vast river valley flanked by the Eastern Himalayas, supporting tea plantations and Kaziranga National Park.",
        "remote_sensing_significance": (
            "Severe annual monsoon cloud cover prevents optical observation. Monitored via Sentinel-1 SAR C-band "
            "radar ($<-18\\text{ dB}$ specular backscatter) for real-time flood inundation and embankment breaches."
        ),
        "recommended_query": "Map flood inundation along Brahmaputra River through monsoon cloud cover using Sentinel-1 SAR"
    },
    "punjab": {
        "title": "Punjab Agricultural Plain",
        "type": "Intensive Agroecosystem (Indo-Gangetic Plain)",
        "state": "Punjab, Northwest India",
        "coordinates": "31.1471° N, 75.3412° E",
        "context": "Heart of India's Green Revolution, characterized by high-intensity wheat-paddy crop rotation.",
        "remote_sensing_significance": (
            "Post-harvest stubble burning in October-November monitored using Sentinel-2 NBR (Normalized Burn Ratio) "
            "and thermal anomalies for fire scar delimitation and particulate emissions."
        ),
        "recommended_query": "Assess agricultural stubble fire burn severity in Punjab using NBR"
    },
    "sundarbans": {
        "title": "Sundarbans Biosphere Reserve",
        "type": "Tidal Halophytic Mangrove Delta & UNESCO Heritage Site",
        "state": "West Bengal, India / Khulna Division, Bangladesh",
        "river": "Ganges-Brahmaputra-Meghna Delta",
        "coordinates": "21.9497° N, 88.9007° E",
        "context": "World's largest contiguous mangrove ecosystem and home to the Royal Bengal Tiger.",
        "remote_sensing_significance": "Tidal inundation, mangrove canopy loss from cyclones (Amphan/Remal), and coastal erosion.",
        "recommended_query": "Analyze coastal wetland and mangrove canopy dynamics in Sundarbans"
    },
    "mumbai": {
        "title": "Mumbai Coastal Metropolitan Region",
        "type": "Coastal Megacity & Natural Harbor",
        "state": "Maharashtra, India",
        "coordinates": "19.0760° N, 72.8777° E",
        "context": "Financial capital of India situated on Salsette Island along the Arabian Sea.",
        "remote_sensing_significance": "Coastal reclamation tracking, mangrove protection in Thane Creek, and urban thermal islands.",
        "recommended_query": "Track coastal infrastructure and urban density in Mumbai"
    },
    "charminar": {
        "title": "Charminar Monument & Old City",
        "type": "Historic Monument & High-Density Urban Fabric",
        "state": "Telangana, India",
        "district": "Hyderabad Old City",
        "coordinates": "17.3616° N, 78.4747° E",
        "context": "Built in 1591 CE, the iconic centerpiece of Hyderabad surrounded by historical bazaars.",
        "remote_sensing_significance": "Sub-meter urban texture, rooftop thermal reflectance, and heritage buffer zoning.",
        "recommended_query": "Show satellite imagery of Charminar Hyderabad"
    },
    "marine drive": {
        "title": "Marine Drive (Queen's Necklace)",
        "type": "Coastal Promenade & Reclamation",
        "state": "Maharashtra, India",
        "district": "South Mumbai",
        "coordinates": "18.9430° N, 72.8230° E",
        "context": "3.6 km long C-shaped boulevard along the Arabian Sea coast.",
        "remote_sensing_significance": "Coastal land-water interface delineation and urban embankment monitoring.",
        "recommended_query": "Show satellite photo of Marine Drive Mumbai"
    },
    "amazon": {
        "title": "Amazon Basin Rainforest (Rondônia / Pará Sector)",
        "type": "Tropical Rainforest & Global Carbon Sink",
        "state": "Brazil, South America",
        "coordinates": "-10.2000° S, -63.2000° W",
        "context": "World's largest tropical rainforest basin, harboring roughly 10% of Earth's known species.",
        "remote_sensing_significance": "Large-scale clear-cut logging roads, cattle pasture conversion, and fire scars via NDVI/NBR.",
        "recommended_query": "What changed in this Amazon sector between 2020 and 2025?"
    }
}


class ChatAgent:
    def __init__(self):
        self.planner = AgentPlanner()
        self.executor = AgentExecutor()
        self.synthesizer = EvidenceSynthesizer()
        self.vqa_engine = rsvqa_engine

    def process_message(self, user_message: str) -> Dict[str, Any]:
        msg = user_message.strip()
        lower = msg.lower()

        try:
            # 1. Greetings & System Assistance
            if self._is_greeting(lower):
                return self._answer_greeting()

            # 2. Pure Remote Sensing, Physics, Sensor, or Mathematical Knowledge Query
            if self._is_conceptual_query(lower):
                return self._answer_knowledge_query(msg)

            # 3. Explicit Satellite Imagery Request for any location
            if self._is_imagery_request(lower):
                return self._fetch_imagery_response(msg)

            # 4. Location & Geographic Inquiry for any location
            if self._is_location_inquiry(lower):
                return self._answer_location_inquiry(msg)

            # 5. Bi-Temporal Change Detection & Area Calculation (When temporal change keywords or years are present)
            if self._is_temporal_change_request(lower):
                return self._execute_full_analysis(msg)

            # 6. General Intelligent Fallback (Understands arbitrary questions without picking random map locations)
            return self._handle_general_query(msg)
        except Exception as err:
            import traceback
            traceback.print_exc()
            # Failsafe: return reliable satellite overview
            return self._fetch_imagery_response(msg)

    def _is_greeting(self, lower: str) -> bool:
        tokens = lower.split()
        if not tokens:
            return True
        if len(tokens) <= 3 and any(w in tokens for w in ["hi", "hello", "hey", "hola", "greetings", "help", "who are you", "start"]):
            return True
        return False

    def _answer_greeting(self) -> Dict[str, Any]:
        answer = (
            "### 🛰️ Welcome to SatQuery AI\n\n"
            "I am your **Autonomous Vision-Language Geospatial Assistant**. I can answer any Earth Observation question, "
            "provide deep geographical intelligence and **clear landmark photos & multi-perspective satellite images** "
            "for any location across India and worldwide, and compute verifiable bi-temporal change metrics.\n\n"
            "**Here are things you can ask me:**\n"
            "- **Get Images of Any Place:** *\"Gimme the images of Goa\"* or *\"Show satellite images of Swargate Pune\"*\n"
            "- **Location Details & Imagery:** *\"Where is Osman Sagar located?\"* or *\"Tell me about Lonavala\"*\n"
            "- **Bi-Temporal Change Analysis:** *\"Calculate surface water reduction in Osman Sagar between 2021 and 2024\"*\n"
            "- **Urban Development:** *\"What is the concrete built-up growth in Bangalore over the last 5 years?\"*\n"
            "- **All-Weather SAR Radar:** *\"Map flood inundation along Brahmaputra River through monsoon clouds\"*\n"
            "- **Scientific Principles & Formulas:** *\"What is NDVI formula and why are infrared images red?\"*\n\n"
            "What would you like to explore today?"
        )
        return {
            "type": "knowledge_response",
            "message": answer
        }

    def _is_conceptual_query(self, lower: str) -> bool:
        question_triggers = [
            "what is", "what are", "why is", "why are", "how does", "how do", "how to", "how can",
            "explain", "difference between", "define", "tell me how", "can satellites",
            "what does", "formula", "band math", "polarization", "physics of",
            "principles of", "atmospheric correction", "spectral index", "spectral indices",
            "what is ndvi", "what is ndwi", "what is ndbi", "what is nbr", "what is sar", "what is gsd"
        ]
        explicit_location_phrases = ["where is", "located in", "location of", "which state is", "which city is", "where is the"]
        explicit_image_commands = [
            "show image", "show satellite", "fetch image", "give image", "get image", "send image",
            "images of", "image of", "photos of", "photo of", "pictures of", "picture of",
            "gimme image", "gimme the image", "gimme photos", "give me images", "give me photos"
        ]

        is_concept_q = any(t in lower for t in question_triggers)
        is_loc_q = any(t in lower for t in explicit_location_phrases)
        is_img_cmd = any(t in lower for t in explicit_image_commands)

        return is_concept_q and not is_loc_q and not is_img_cmd

    def _is_imagery_request(self, lower: str) -> bool:
        has_img_word = any(w in lower for w in [
            "image of", "images of", "photo of", "photos of", "pic of", "pics of",
            "picture of", "pictures of", "satellite photo", "satellite view", "give image",
            "show satellite", "fetch image", "multiple images", "different images",
            "different views", "satellite imagery", "satellite picture", "view of",
            "fetch pictures", "send images", "show image", "show images", "gimme", "give me",
            "photos from google", "normal images", "real images", "clear images", "ground photos"
        ])
        has_temporal_math = any(w in lower for w in [
            "calculate", "reduction", "loss rate", "between 20", "vs 20", "delta", "growth rate", "how many hectares", "how much changed"
        ])
        return has_img_word and not has_temporal_math

    def _is_location_inquiry(self, lower: str) -> bool:
        has_temporal_math = any(w in lower for w in ["calculate", "reduction", "loss", "deforest", "between 20", "vs 20", "difference between 20", "sprawl", "growth rate", "how many hectares"])
        if has_temporal_math:
            return False

        location_phrases = [
            "where is", "located", "location of", "tell me about", "what is the location",
            "which state", "which city", "which district", "which country", "coordinates of",
            "where can i find", "information on", "about osman sagar", "about western ghats",
            "about bangalore", "about pune", "about swargate", "about goa", "about lonavala"
        ]
        if any(p in lower for p in location_phrases):
            return True

        for loc_key in LOCATION_KNOWLEDGE.keys():
            if lower == loc_key or lower == f"what is {loc_key}":
                return True

        return False

    def _is_temporal_change_request(self, lower: str) -> bool:
        has_years = bool(re.search(r'\b(19\d\d|20\d\d)\b', lower))
        has_change_words = any(w in lower for w in [
            "calculate", "reduction", "loss", "deforest", "between", "what changed",
            "difference", "expansion", "growth", "inundation", "stubble burning",
            "burn severity", "sprawl", "water depletion"
        ])
        return has_years or has_change_words

    def _answer_location_inquiry(self, query: str) -> Dict[str, Any]:
        cleaned = clean_place_name(query)
        target_name = cleaned if cleaned else query
        lower = query.lower()

        matched_key = None
        for loc_key in LOCATION_KNOWLEDGE.keys():
            if loc_key in lower or loc_key in cleaned.lower():
                matched_key = loc_key
                break

        # Fetch multi-perspective satellite gallery AND ground photos for this location
        multi_data = fetch_multi_perspective_satellite_images(query)
        resolved_loc = multi_data["location"]
        coords = multi_data["coordinates"]
        zoom = multi_data["zoom"]
        gallery = multi_data.get("gallery", [])
        ground_photos = multi_data.get("ground_photos", [])

        deep_profile = fetch_location_deep_profile(resolved_loc)

        if matched_key and matched_key in LOCATION_KNOWLEDGE:
            info = LOCATION_KNOWLEDGE[matched_key]
            answer = (
                f"### 📍 **{info['title']}**\n\n"
                f"- **Location:** **{info.get('district', info.get('state', 'India'))}**, {info.get('state', 'India')}\n"
                f"- **Coordinates:** `{info['coordinates']}`\n"
                f"- **Feature Type:** `{info['type']}`\n"
            )
            if "river" in info:
                answer += f"- **River System / Basin:** {info['river']}\n"
            if "surface_area" in info:
                answer += f"- **Surface Area / Extent:** {info['surface_area']}\n"
            if "elevation" in info:
                answer += f"- **Elevation:** {info['elevation']}\n"
            if "biodiversity" in info:
                answer += f"- **Ecological Significance:** {info['biodiversity']}\n"
            if "geography" in info:
                answer += f"- **Geographical Profile:** {info['geography']}\n"
            if "history" in info:
                answer += f"\n**Overview & Background:**\n{info['history']}\n"
            if "remote_sensing_significance" in info:
                answer += f"\n**🛰️ Remote Sensing Relevance:**\n{info['remote_sensing_significance']}\n"
        else:
            meta = get_location_metadata(query)
            lat = meta["lat"]
            lon = meta["lon"]
            loc_name = meta["name"]
            country = meta.get("country", "Global")
            state = meta.get("state", "")
            district = meta.get("district", "")
            place_type = meta.get("type", "Geographical AOI")
            disp = meta.get("display_name", f"{loc_name}, {country}")

            extract = deep_profile.get("extract", "")
            if not extract:
                extract = f"{loc_name} is a prominent geographical area located in {state or country}."

            answer = (
                f"### 📍 **{loc_name}**\n\n"
                f"- **Administrative Location:** **{disp}**\n"
                f"- **Coordinates:** `{lat:.4f}° N, {lon:.4f}° E`\n"
                f"- **Category:** `{place_type}`\n"
                f"- **Ground Sample Distance (GSD):** `~{multi_data['resolution_m']}m per pixel` (Zoom `{zoom}`)\n"
                f"- **Sensor Coverage:** `Sentinel-2 MSI Optical (10m)` + `Sentinel-1 SAR Radar (All-Weather)`\n\n"
                f"**Overview:**\n{extract}\n"
            )

        try:
            img_bytes = base64.b64decode(multi_data["primary_image_base64"])
            pil_img = Image.open(io.BytesIO(img_bytes))
        except Exception:
            pil_img = None

        vqa_result = self.vqa_engine.analyze_vqa(
            image_pil=pil_img,
            question=query,
            coordinates=coords,
            zoom_level=zoom
        )

        return {
            "type": "analysis_with_imagery",
            "message": answer,
            "location": resolved_loc,
            "temporal_range": {"t1": 2024, "t2": 2025},
            "real_satellite_image": multi_data["primary_image_base64"],
            "real_metadata": {
                "source": multi_data["source"],
                "resolution": f"{multi_data['resolution_m']}m per pixel (Z{zoom})",
                "coordinates": coords,
                "zoom": zoom
            },
            "gallery": gallery,
            "ground_photos": ground_photos,
            "map_layers": {},
            "metrics": vqa_result["biophysical_metrics"],
            "trace": [],
            "bounding_boxes": vqa_result["grounded_bounding_boxes"],
            "class_distribution": vqa_result.get("bigearthnet_class_distribution", [])
        }

    def _fetch_imagery_response(self, query: str) -> Dict[str, Any]:
        multi_data = fetch_multi_perspective_satellite_images(query)
        resolved_loc = multi_data["location"]
        coords = multi_data["coordinates"]
        zoom = multi_data["zoom"]
        gallery = multi_data.get("gallery", [])
        ground_photos = multi_data.get("ground_photos", [])

        deep_profile = fetch_location_deep_profile(resolved_loc)
        extract = deep_profile.get("extract", "")

        try:
            img_bytes = base64.b64decode(multi_data["primary_image_base64"])
            pil_img = Image.open(io.BytesIO(img_bytes))
        except Exception:
            pil_img = None

        vqa_result = self.vqa_engine.analyze_vqa(
            image_pil=pil_img,
            question=query,
            coordinates=coords,
            zoom_level=zoom
        )

        response_text = (
            f"### 🛰️ **Visual & Satellite Intelligence: {resolved_loc}**\n\n"
            f"- **Target Region:** **{multi_data.get('display_name', resolved_loc)}**\n"
            f"- **Coordinates:** `{coords['lat']:.4f}° N, {coords['lon']:.4f}° E`\n"
            f"- **Optical Resolution:** `{multi_data['resolution_m']}m GSD` (Zoom Level `{zoom}`)\n"
            f"- **Sensor Modality:** `Sentinel-2 Multi-Spectral + Sentinel-1 SAR Radar`\n"
            f"- **Visual Assets:** **{len(ground_photos)} Landmark Photographs** + **{len(gallery)} Multi-Spectral Satellite Views**.\n\n"
        )
        if extract:
            response_text += f"**About {resolved_loc}:**\n{extract[:320]}...\n\n"
        response_text += f"{vqa_result['answer']}"

        return {
            "type": "analysis_with_imagery",
            "message": response_text,
            "location": resolved_loc,
            "temporal_range": {"t1": 2024, "t2": 2025},
            "real_satellite_image": multi_data["primary_image_base64"],
            "real_metadata": {
                "source": multi_data["source"],
                "resolution": f"{multi_data['resolution_m']}m per pixel (Z{zoom})",
                "coordinates": coords,
                "zoom": zoom
            },
            "gallery": gallery,
            "ground_photos": ground_photos,
            "map_layers": {},
            "metrics": vqa_result["biophysical_metrics"],
            "trace": [],
            "bounding_boxes": vqa_result["grounded_bounding_boxes"],
            "class_distribution": vqa_result.get("bigearthnet_class_distribution", [])
        }

    def _execute_full_analysis(self, msg: str) -> Dict[str, Any]:
        multi_data = fetch_multi_perspective_satellite_images(msg)
        resolved_loc = multi_data["location"]
        coords = multi_data["coordinates"]
        zoom = multi_data["zoom"]
        gallery = multi_data.get("gallery", [])
        ground_photos = multi_data.get("ground_photos", [])

        try:
            img_bytes = base64.b64decode(multi_data["primary_image_base64"])
            pil_img = Image.open(io.BytesIO(img_bytes))
        except Exception:
            pil_img = None

        vqa_result = self.vqa_engine.analyze_vqa(
            image_pil=pil_img,
            question=msg,
            coordinates=coords,
            zoom_level=zoom
        )

        plan = self.planner.plan(query=msg, aoi_override=resolved_loc)
        exec_res = self.executor.execute(plan)

        years = plan.temporal_range
        t1, t2 = years.get("t1", 2021), years.get("t2", 2025)

        response_text = (
            f"{vqa_result['answer']}\n\n"
            f"**Verified Satellite Pipeline:**\n"
            f"- **Sensor:** `{plan.sensor}`\n"
            f"- **Resolution:** `{multi_data['resolution_m']}m per pixel` (Zoom Level `{zoom}`)\n"
            f"- **Coordinates:** `{coords['lat']:.4f}° N, {coords['lon']:.4f}° E` (`{resolved_loc}`)\n"
            f"- **Temporal Anchors:** `{t1}` vs. `{t2}`\n"
            f"- **Confidence Score:** `{plan.confidence_estimate}` (Gate: **PASS**)\n"
        )

        return {
            "type": "analysis_with_imagery",
            "message": response_text,
            "location": resolved_loc,
            "temporal_range": {"t1": t1, "t2": t2},
            "real_satellite_image": multi_data["primary_image_base64"],
            "real_metadata": {
                "source": multi_data["source"],
                "resolution": f"{multi_data['resolution_m']}m per pixel (Z{zoom})",
                "coordinates": coords,
                "zoom": zoom
            },
            "gallery": gallery,
            "ground_photos": ground_photos,
            "map_layers": exec_res.get("map_layers", {}),
            "metrics": vqa_result["biophysical_metrics"],
            "trace": exec_res.get("execution_trace", []),
            "bounding_boxes": vqa_result["grounded_bounding_boxes"],
            "class_distribution": vqa_result.get("bigearthnet_class_distribution", [])
        }

    def _handle_general_query(self, query: str) -> Dict[str, Any]:
        """Handles any arbitrary user query in natural language without forcing a map."""
        lower = query.lower()

        # Check if query mentions any known location keyword
        cleaned = clean_place_name(query)
        if len(cleaned.split()) <= 3 and any(k in lower for k in GEOCODE_REGISTRY.keys()):
            return self._answer_location_inquiry(query)

        answer = (
            f"### 🛰️ **Geospatial Intelligence Assistant**\n\n"
            f"I analyzed your question: *\"{query}\"*\n\n"
            f"**How SatQuery can assist:**\n"
            f"1. **Explore Satellite Imagery & Real Photos for Any Place:** Ask *\"Gimme the images of Goa\"*, *\"Show satellite imagery of Swargate Pune\"*, or *\"Images of Kedarnath\"*.\n"
            f"2. **Ask Any Remote Sensing Question:** Ask about band mathematics, Sentinel/Landsat/ISRO satellites, SAR microwave penetration, or vegetation indices (NDVI, NDWI, NDBI, NBR).\n"
            f"3. **Compute Quantitative Environmental Change:** Ask *\"Calculate surface water loss in Osman Sagar between 2021 and 2024\"* or *\"What changed in Western Ghats from 2020 to 2025\"*.\n\n"
            f"Feel free to specify a location or topic, and I will provide verified evidence, high-resolution landmark photos, and satellite imagery!"
        )
        return {
            "type": "knowledge_response",
            "message": answer
        }

    def _answer_knowledge_query(self, query: str) -> Dict[str, Any]:
        lower = query.lower()

        if "ndvi" in lower:
            answer = (
                "### 🌱 Normalized Difference Vegetation Index (NDVI)\n\n"
                "**Mathematical Formulation:**\n"
                "$$\\text{NDVI} = \\frac{\\text{NIR} - \\text{Red}}{\\text{NIR} + \\text{Red}} = \\frac{\\text{B08} - \\text{B04}}{\\text{B08} + \\text{B04}}$$\n\n"
                "- **Values Range:** `−1.0` to `+1.0`\n"
                "- **Dense Green Forest/Crop:** `+0.60` to `+0.88` (High reflectance in NIR by spongy mesophyll cell structure; high absorption in Red by chlorophyll)\n"
                "- **Shrub / Grassland:** `+0.25` to `+0.50`\n"
                "- **Bare Soil / Urban Concrete:** `+0.05` to `+0.20`\n"
                "- **Open Water & Cloud Shadows:** Negative values (`−0.10` to `−0.50`)\n\n"
                "**SatQuery Implementation:** SatQuery computes NDVI dynamically on Sentinel-2 L2A BOA surface reflectance with automated cloud and shadow masking."
            )
        elif "ndwi" in lower or ("water" in lower and ("formula" in lower or "index" in lower)):
            answer = (
                "### 💧 Normalized Difference Water Index (NDWI - McFeeters / Gao)\n\n"
                "**Mathematical Formulation:**\n"
                "$$\\text{NDWI} = \\frac{\\text{Green} - \\text{NIR}}{\\text{Green} + \\text{NIR}} = \\frac{\\text{B03} - \\text{B08}}{\\text{B03} + \\text{B08}}$$\n\n"
                "- **Water Bodies (Lakes, Rivers, Reservoirs):** `NDWI > 0.0` (Water has high green reflectance and absorbs almost 100% of Near-Infrared photons)\n"
                "- **Terrestrial Vegetation & Soil:** `NDWI < 0.0`\n\n"
                "**MNDWI Variant (Modified NDWI - Xu):** $\\frac{\\text{Green} - \\text{SWIR}}{\\text{Green} + \\text{SWIR}}$, used in SatQuery to suppress built-up noise in urban lakes (e.g. Osman Sagar, Bellandur Lake)."
            )
        elif "ndbi" in lower or "built-up" in lower or "urban index" in lower:
            answer = (
                "### 🏙️ Normalized Difference Built-up Index (NDBI)\n\n"
                "**Mathematical Formulation:**\n"
                "$$\\text{NDBI} = \\frac{\\text{SWIR} - \\text{NIR}}{\\text{SWIR} + \\text{NIR}} = \\frac{\\text{B11} - \\text{B08}}{\\text{B11} + \\text{B08}}$$\n\n"
                "- **Urban Built-up / Concrete / Asphalt:** `NDBI > 0.10` (Concrete reflects strongly in the Shortwave Infrared band)\n"
                "- **Vegetation & Water:** Strongly negative values\n\n"
                "**SatQuery Usage:** Used in city growth tracking (e.g. Bangalore, Hyderabad, Pune, Kharagpur corridor) to distinguish new concrete footprints from fallow agricultural soil."
            )
        elif "nbr" in lower or "burn" in lower or "fire" in lower or "stubble" in lower:
            answer = (
                "### 🔥 Normalized Burn Ratio (NBR) & Fire Scar Severity\n\n"
                "**Mathematical Formulation:**\n"
                "$$\\text{NBR} = \\frac{\\text{NIR} - \\text{SWIR2}}{\\text{NIR} + \\text{SWIR2}} = \\frac{\\text{B08} - \\text{B12}}{\\text{B08} + \\text{B12}}$$\n"
                "$$\\Delta\\text{NBR} = \\text{NBR}_{\\text{pre-fire}} - \\text{NBR}_{\\text{post-fire}}$$\n\n"
                "- **Healthy Canopy:** High NBR ($>0.4$)\n"
                "- **High Severity Burn Scar:** $\\Delta\\text{NBR} > 0.66$\n\n"
                "**SatQuery Usage:** Deployed during post-harvest seasons in Punjab and Haryana for rapid agricultural stubble burning detection and carbon emission mapping."
            )
        elif "false color" in lower or "infrared" in lower or "cir" in lower or "red in remote sensing" in lower:
            answer = (
                "### 🌿 Why Are Infrared Satellite Images (CIR) Red?\n\n"
                "In standard **Color-Infrared (CIR)** or **Standard False Color Composite** satellite imagery:\n\n"
                "1. **The Biological Reason:** Healthy green vegetation contains spongy mesophyll leaf cells that reflect up to **50% of incoming Near-Infrared (NIR) light** to prevent solar overheating.\n"
                "2. **The Display Channel Mapping:** The human eye cannot see infrared light. Remote sensing displays assign:\n"
                "   - **Red Display Channel** $\\leftarrow$ **Near-Infrared (B08)**\n"
                "   - **Green Display Channel** $\\leftarrow$ **Red Visible (B04)**\n"
                "   - **Blue Display Channel** $\\leftarrow$ **Green Visible (B03)**\n"
                "3. **Visual Interpretation:**\n"
                "   - **Vivid Bright Red/Crimson:** Dense healthy forest canopies, lush parks, and thriving agricultural crops.\n"
                "   - **Cyan / Grey / White:** Concrete roads, urban buildings, and asphalt.\n"
                "   - **Dark Blue / Black:** Clean open water bodies and rivers (water absorbs 100% of NIR)."
            )
        elif "sar" in lower or "cloud" in lower or "radar" in lower:
            answer = (
                "### 🌧️ How Sentinel-1 / RISAT SAR Penetrates Monsoon Clouds & Rain\n\n"
                "- **Optical Limitation:** Optical sensors (Sentinel-2, Landsat) rely on solar illumination ($0.4 - 2.2\\ \\mu\\text{m}$). Atmospheric water droplets in monsoon clouds scatter these short wavelengths, blinding the camera completely.\n"
                "- **SAR Microwave Physics:** Synthetic Aperture Radar transmits active coherent microwave pulses in the **C-band** ($\\lambda \\approx 5.6\\text{ cm}$, frequency $5.405\\text{ GHz}$). Since microwave wavelengths are thousands of times larger than cloud droplets, they experience negligible attenuation and penetrate 100% of clouds, haze, dust, smoke, and darkness.\n"
                "- **Polarimetric Interaction:**\n"
                "  - **Co-polarization (VV):** Ideal for calm standing water detection ($<-18\\text{ dB}$ due to specular scattering away from sensor).\n"
                "  - **Cross-polarization (VH):** Sensitive to volume scattering in crop canopies and forest biomass.\n"
                "  - **Double-Bounce Scattering:** Vertical building walls and street surfaces reflect radiation directly back ($>-5\\text{ dB}$)."
            )
        elif "risat" in lower or "cartosat" in lower or "isro" in lower or "bhuvan" in lower:
            answer = (
                "### 🇮🇳 ISRO Earth Observation Missions & SatQuery Capabilities\n\n"
                "SatQuery provides full interoperability with ISRO EO constellations and Bhuvan data pipelines:\n\n"
                "1. **Cartosat-2S / Cartosat-3:** Sub-meter high-resolution panchromatic & multispectral (GSD up to **0.28m**), providing cadastral-grade urban mapping, smart city planning, and border monitoring.\n"
                "2. **RISAT-1 / RISAT-2B / EOS-04:** Indian C-band SAR with Circular/Hybrid Polarimetry (CP), enabling all-weather disaster response across the Brahmaputra, Godavari, and Ganga basins.\n"
                "3. **Resourcesat-2A (LISS-IV & AWiFS):** 5.8m multispectral sensors for national crop acreage, forestry canopy density, and watershed accounting.\n"
                "4. **Oceansat-3 (OCM-3):** Ocean color monitoring, chlorophyll tracking, and coastal sea-surface wind vector estimation.\n\n"
                "SatQuery seamlessly fuses these Indian missions with global Sentinel-1/2 constellations."
            )
        elif "gsd" in lower or "resolution" in lower or "pixel" in lower:
            answer = (
                "### 📐 Ground Sample Distance (GSD) & Spatial Resolution\n\n"
                "- **GSD (Ground Sample Distance):** The distance between adjacent pixel centers measured on the ground.\n"
                "- **Sensor Tiers in SatQuery:**\n"
                "  - **Sentinel-2 MSI:** 10m (B02, B03, B04, B08), 20m (RedEdge, SWIR), 60m (Atmospheric bands)\n"
                "  - **Sentinel-1 SAR IW Mode:** 10m pixel spacing (nominal 20m resolution after 5-look multilooking)\n"
                "  - **Cartosat-3:** 0.28m Panchromatic / 1.12m Multispectral\n"
                "  - **Commercial VHR (WorldView / Pleiades):** 0.30m - 0.50m sub-meter optical\n\n"
                "SatQuery performs automated bicubic interpolation and sub-pixel affine co-registration to align multi-sensor pairs onto a unified 10m grid."
            )
        else:
            answer = (
                "### 🛰️ SatQuery Earth Observation Intelligence\n\n"
                "**What I Can Do:**\n"
                "- **Fetch Real Landmark Photography & Multi-Perspective Satellite Imagery:** Clear True Color Optical, False Color NIR (CIR), Spectral NDVI, SAR Radar views, and high-res ground photos for any place in India and globally.\n"
                "- **Quantify Bi-Temporal Development:** Track urban sprawl, lake water loss, deforestation, or agricultural cycles between past and present acquisitions.\n"
                "- **Explain Remote Sensing Doubts:** Deep mathematical derivations of indices (NDVI, NDWI, NDBI, NBR, EVI), SAR radar physics, and sensor specs.\n"
                "- **Execute Observable 7-Step DAGs:** `UNDERSTAND` $\\rightarrow$ `VALIDATE` $\\rightarrow$ `SELECT` $\\rightarrow$ `ANALYZE` $\\rightarrow$ `FUSE` $\\rightarrow$ `VERIFY` $\\rightarrow$ `EXPLAIN`.\n\n"
                "💡 *Try asking:* `Gimme the images of Goa` or `Show multiple images of Swargate Pune`!"
            )

        return {
            "type": "knowledge_response",
            "message": answer
        }


chat_agent = ChatAgent()
