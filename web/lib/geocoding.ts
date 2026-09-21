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
