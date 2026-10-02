/**
 * Universal Intelligent Geocoding & Geospatial Location Intelligence
 * Comprehensive Pan-India High-Precision City & Region Database with Instant Zero-Latency Lookup.
 */

import { API_BASE } from "@/lib/api";

export type LocationBriefing = {
  name: string;
  state: string;
  country?: string;
  regionCategory?: "North" | "South" | "West" | "East" | "Central" | "Himalayan & Islands";
  type: string;
  coords: [number, number]; // [lng, lat]
  bbox: number[]; // [west, south, east, north]
  zoom: number;
  pitch: number;
  climateZone: string;
  terrainType: string;
  landCoverSummary: string;
  recommendedSensor: "Sentinel-2 MSI (Optical)" | "Sentinel-1 (C-Band SAR)" | "Joint Optical + SAR";
  suggestedQuestions: string[];
  ecologicalSignificance: string;
  localHotspots?: string[];
};

// Comprehensive Pan-India Multi-Tier City & Strategic Environmental Database
export const INDEXED_INDIAN_LOCATIONS: LocationBriefing[] = [
  // ==================== WESTERN INDIA ====================
  {
    name: "Ahmedabad & Sabarmati Corridor",
    state: "Gujarat",
    country: "India",
    regionCategory: "West",
    type: "Megacity & Industrial Metropolis",
    coords: [72.5714, 23.0225],
    bbox: [72.48, 22.95, 72.65, 23.10],
    zoom: 12.5,
    pitch: 52,
    climateZone: "Hot Semi-Arid (BSh)",
    terrainType: "Alluvial Plain & Urban Riverfront",
    landCoverSummary: "Dense built-up infrastructure (54%), peri-urban bare soil (28%), sparse vegetation (14%), Sabarmati reservoir water (4%).",
    recommendedSensor: "Sentinel-2 MSI (Optical)",
    suggestedQuestions: [
      "Measure urban built-up expansion (pp) along the SG Highway and SP Ring Road.",
      "Calculate NDVI vegetation loss due to commercial development.",
      "Track water surface changes in the Sabarmati Riverfront development.",
    ],
    ecologicalSignificance: "Major industrial and urban growth corridor in Western India experiencing high-rate peripheral land conversion.",
    localHotspots: [
      "SG Highway Tech Corridor",
      "Sabarmati Riverfront Phase 2",
      "Sanand Industrial GIDC",
      "SP Ring Road Commercial Belt",
      "Bopal-Ambli High-Density Zone",
      "Chandkheda Growth Node",
    ],
  },
  {
    name: "GIFT City (Gandhinagar)",
    state: "Gujarat",
    country: "India",
    regionCategory: "West",
    type: "Global Financial Tec-City & Smart Hub",
    coords: [72.6842, 23.1606],
    bbox: [72.65, 23.13, 72.72, 23.19],
    zoom: 13.5,
    pitch: 55,
    climateZone: "Semi-Arid Subtropical",
    terrainType: "Planned Smart Grid on River Sabarmati",
    landCoverSummary: "High-density commercial towers and underground utility tunnels (65%), planned green buffer (25%), riverfront bank (10%).",
    recommendedSensor: "Joint Optical + SAR",
    suggestedQuestions: [
      "Quantify vertical high-rise construction density and concrete footprint changes.",
      "Monitor Sabarmati riverfront embankment greening and flood defenses.",
      "Analyze thermal radiance and impervious surface expansion in GIFT Phase 2.",
    ],
    ecologicalSignificance: "India's first operational smart city and international financial services centre with automated district cooling and waste infrastructure.",
    localHotspots: [
      "GIFT Tower SEZ Zone",
      "International Banking Cluster",
      "Sabarmati Barrage Embankment",
      "FinTech Processing Hub",
    ],
  },
  {
    name: "Mumbai Coastal Peninsula & MMR",
    state: "Maharashtra",
    country: "India",
    regionCategory: "West",
    type: "Coastal Megacity & Financial Capital",
    coords: [72.8777, 19.0760],
    bbox: [72.76, 18.88, 73.02, 19.25],
    zoom: 11.8,
    pitch: 54,
    climateZone: "Tropical Monsoon (Am)",
    terrainType: "Coastal Peninsula & Creek Estuaries",
    landCoverSummary: "High-density urban fabric (58%), Arabian Sea and Thane Creek water (32%), Sanjay Gandhi National Park forest (10%).",
    recommendedSensor: "Sentinel-1 (C-Band SAR)",
    suggestedQuestions: [
      "Detect coastal reclamation footprints for coastal road and harbor expansions.",
      "Assess monsoon flood inundation across Mithi River basin using SAR radar.",
      "Analyze forest canopy health in Sanjay Gandhi National Park.",
    ],
    ecologicalSignificance: "Densely populated coastal peninsula vulnerable to Arabian Sea sea-level rise, storm surges, and monsoon waterlogging.",
    localHotspots: [
      "Bandra-Kurla Complex (BKC)",
      "Navi Mumbai International Airport Site",
      "Worli-Marine Drive Coastal Reclamation",
      "Thane Ghodbunder Infrastructure Belt",
      "Powai Lake Catchment",
      "JNPT Nhava Sheva Terminal",
      "Sanjay Gandhi National Park Canopy",
    ],
  },
  {
    name: "Pune & Hinjawadi IT Corridor",
    state: "Maharashtra",
    country: "India",
    regionCategory: "West",
    type: "Technology & Automotive Industrial Hub",
    coords: [73.8567, 18.5204],
    bbox: [73.72, 18.42, 73.98, 18.64],
    zoom: 12.2,
    pitch: 50,
    climateZone: "Tropical Wet and Dry (Aw)",
    terrainType: "Deccan Plateau Foothills (560m)",
    landCoverSummary: "Built-up tech parks & residential (52%), Deccan scrub slopes (26%), Mutha river basin (8%), irrigated agricultural fringes (14%).",
    recommendedSensor: "Sentinel-2 MSI (Optical)",
    suggestedQuestions: [
      "Measure tech park expansion in Hinjawadi Phases 1, 2, and 3.",
      "Quantify vegetation canopy shifts along the Western Ghats foothills.",
      "Track industrial footprint growth in Chakan and Talegaon auto belts.",
    ],
    ecologicalSignificance: "Fast-growing urban conglomerate nestled against the biodiversity-rich Western Ghats escarpment.",
    localHotspots: [
      "Swargate Multimodal Transit Hub & Saras Baug",
      "Hinjawadi Rajiv Gandhi Infotech Park",
      "Magarpatta City & Kharadi EON SEZ",
      "Chakan Automotive Cluster",
      "Viman Nagar & Nagar Road IT Belt",
      "Baner-Balewadi High Street",
      "Kothrud & Chandani Chowk",
      "Hadapsar Industrial Zone",
    ],
  },
  {
    name: "Swargate & Saras Baug (Pune)",
    state: "Maharashtra",
    country: "India",
    regionCategory: "West",
    type: "Transit Hub, Metro Junction & Urban Center",
    coords: [73.8575, 18.5005],
    bbox: [73.84, 18.485, 73.875, 18.515],
    zoom: 13.8,
    pitch: 52,
    climateZone: "Tropical Wet and Dry (Aw)",
    terrainType: "Urban Basin at Foothills of Parvati Hill",
    landCoverSummary: "High-density commercial fabric, underground Pune Metro station, bus transit terminal (72%), Saras Baug gardens & Peshwa lake (18%), Mutha canal buffer (10%).",
    recommendedSensor: "Sentinel-2 MSI (Optical)",
    suggestedQuestions: [
      "Analyze urban impervious surface and building density around Swargate Metro Station.",
      "Monitor green cover and lake water levels in Saras Baug and Peshwe Park.",
      "Track traffic corridor and commercial expansion along Shivaji Road and Satara Road.",
    ],
    ecologicalSignificance: "Crucial commercial gateway connecting Central Pune to Southern Maharashtra, bordered by the ecological Parvati Hill ridge.",
    localHotspots: [
      "Swargate Underground Metro Station",
      "Saras Baug & Peshwa Lake Park",
      "PMPML & MSRTC Central Bus Depot",
      "Parvati Hill Forest Reserve",
      "Shivaji Market Commercial Zone",
    ],
  },
  {
    name: "Surat Diamond City & Hazira",
    state: "Gujarat",
    country: "India",
    regionCategory: "West",
    type: "Diamond & Heavy Industry Hub",
    coords: [72.8311, 21.1702],
    bbox: [72.68, 21.05, 72.95, 21.28],
    zoom: 12.0,
    pitch: 48,
    climateZone: "Tropical Savanna (Aw)",
    terrainType: "Tapi Estuary & Coastal Alluvial Plain",
    landCoverSummary: "Dense urban fabric & industrial complexes (60%), Tapi river and tidal creeks (22%), coastal salt pans & bare soil (18%).",
    recommendedSensor: "Joint Optical + SAR",
    suggestedQuestions: [
      "Assess construction progress in the DREAM City Diamond Bourse zone.",
      "Monitor port and petrochemical expansion at Hazira Industrial Belt.",
      "Track tidal water dynamics along the Tapi river estuary.",
    ],
    ecologicalSignificance: "Critical economic hub on the Gulf of Khambhat with dynamic estuarine hydrology and massive industrial development.",
    localHotspots: [
      "Surat DREAM City Diamond Bourse",
      "Hazira Port & Industrial Belt",
      "Vesu-Dumas Urban Corridor",
      "Sachin GIDC Industrial Hub",
      "Tapi Riverfront Embankment",
    ],
  },
  {
    name: "Jaisalmer & Thar Desert Dunes",
    state: "Rajasthan",
