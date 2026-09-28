/**
 * Dynamic Spatial Analysis & Precision Feature Point Extraction for SatQuery AI
 * Contains rich city-specific geo-hotspots across India and dynamic on-map telemetry.
 */

import type { Analysis } from "@/lib/api";

export type DetectedFeaturePoint = {
  id: string;
  name: string;
  category: "built_up" | "vegetation_loss" | "vegetation_gain" | "water" | "farmland" | "infrastructure";
  coords: [number, number]; // [lng, lat]
  title: string;
  description: string;
  changeType: string;
  ndvi: number;
  ndbi: number;
  mndwi: number;
  deltaNdvi?: number;
  deltaNdbi?: number;
  areaHectares: number;
  confidence: number;
  timestamp?: string;
  recommendation: string;
  cityName?: string;
};

export type SpatialAnalysisResult = {
  aoiBbox: number[];
  totalAreaKm2: number;
  features: DetectedFeaturePoint[];
  dominantDevelopment: string;
  developmentTrend: "Accelerating Urban Expansion" | "Vegetation Regeneration" | "Hydrological Inundation" | "Stable Agrarian Baseline";
  summaryStats: {
    newBuiltUpCount: number;
    vegetationAlerts: number;
    waterShiftCount: number;
    sampledPoints: number;
  };
};

// High-Precision Real-World City Hotspots Database for Pan-India Metros & Hubs
type CityHotspotDefinition = {
  cityName: string;
  centerCoords: [number, number]; // [lng, lat]
  radiusDeg: number;
  hotspots: Omit<DetectedFeaturePoint, "id">[];
};

export const PRECISE_INDIAN_CITY_HOTSPOTS: CityHotspotDefinition[] = [
  // ==================== BENGALURU ====================
  {
    cityName: "Bengaluru",
    centerCoords: [77.5946, 12.9716],
    radiusDeg: 0.18,
    hotspots: [
      {
        name: "Whitefield IT & EPIP Zone Expansion",
        category: "built_up",
        coords: [77.7499, 12.9698],
        title: "High-Tech Commercial & Metro Extension",
        description: "High-density tech park towers, residential clusters, and Metro purple line infrastructure. High impervious surface density with +34% NDBI increase.",
        changeType: "Farmland / Open Plots → High-Rise Tech Corridor",
        ndvi: 0.11,
        ndbi: 0.38,
        mndwi: -0.19,
        deltaNdbi: +0.28,
        deltaNdvi: -0.16,
        areaHectares: 18.4,
        confidence: 0.96,
        recommendation: "Inspect Sentinel-1 SAR backscatter to quantify vertical concrete density.",
        cityName: "Bengaluru",
      },
      {
        name: "Bellandur & Varthur Lake Catchment",
        category: "water",
        coords: [77.6743, 12.9348],
        title: "Urban Lake Eutrophication & Siltation Basin",
        description: "Primary cascading stormwater and sewage catchment. Modified Normalized Difference Water Index (MNDWI = 0.32) captures seasonal weed growth and shoreline encroachment.",
        changeType: "Open Water ↔ Weed Canopy & Wetland Encroachment",
        ndvi: 0.28,
        ndbi: -0.06,
        mndwi: 0.32,
        deltaNdvi: +0.08,
        areaHectares: 36.2,
        confidence: 0.94,
        recommendation: "Track multi-temporal MNDWI water boundaries to prevent wetland buffer violations.",
        cityName: "Bengaluru",
      },
      {
        name: "Electronic City Phase 2 Tech SEZ",
        category: "built_up",
        coords: [77.6789, 12.8399],
        title: "Semiconductor & Hardware Tech Corridor",
        description: "Massive hardware manufacturing campuses and elevated expressway junctions. Heavy concrete and metal roof spectral signatures.",
        changeType: "Scrubland → Industrial Hardware SEZ",
        ndvi: 0.09,
        ndbi: 0.42,
        mndwi: -0.22,
        deltaNdbi: +0.31,
        deltaNdvi: -0.12,
        areaHectares: 24.5,
        confidence: 0.95,
        recommendation: "Monitor heat-island surface temperature signatures over industrial roofs.",
        cityName: "Bengaluru",
      },
      {
        name: "Manyata Tech Park & Hebbal Junction",
        category: "infrastructure",
        coords: [77.6214, 13.0478],
        title: "North Bengaluru Commercial Gateway",
        description: "Grade-A office tech parks, multi-level flyovers, and elevated airport expressway. High vehicular and commercial activity.",
        changeType: "Peri-urban → High-Density Corporate Cluster",
        ndvi: 0.14,
        ndbi: 0.35,
        mndwi: -0.15,
        deltaNdbi: +0.22,
        areaHectares: 16.0,
        confidence: 0.93,
        recommendation: "Verify SAR structural backscatter along airport corridor.",
        cityName: "Bengaluru",
      },
      {
        name: "Bannerghatta National Park Eco-Buffer",
        category: "vegetation_gain",
        coords: [77.5750, 12.8000],
        title: "Southern Forest Elephant Corridor",
        description: "Protected deciduous forest canopy (NDVI = 0.52). Vital biological carbon sink buffering Southern Bengaluru from urban sprawl.",
        changeType: "Protected Dense Canopy",
        ndvi: 0.52,
        ndbi: -0.26,
        mndwi: -0.14,
        deltaNdvi: +0.04,
        areaHectares: 85.0,
        confidence: 0.98,
        recommendation: "Detect perimeter forest clearance or illegal quarrying activities.",
        cityName: "Bengaluru",
      },
    ],
  },

  // ==================== DELHI NCR ====================
  {
    cityName: "Delhi NCR",
    centerCoords: [77.2090, 28.6139],
    radiusDeg: 0.28,
    hotspots: [
      {
        name: "Gurgaon Cyber City & Golf Course Road",
        category: "built_up",
        coords: [77.0888, 28.4950],
        title: "Ultra-High Density Corporate Skyscrapers",
        description: "High-rise corporate towers with reflective glass and metallic facades. High NDBI and distinct double-bounce SAR microwave returns.",
        changeType: "Dense Commercial Megastructure",
        ndvi: 0.08,
        ndbi: 0.44,
        mndwi: -0.24,
        deltaNdbi: +0.18,
        deltaNdvi: -0.09,
        areaHectares: 28.0,
        confidence: 0.97,
        recommendation: "Use C-Band SAR to analyze vertical building heights and concrete density.",
        cityName: "Delhi NCR",
      },
      {
        name: "Dwarka Expressway High-Density Corridor",
        category: "built_up",
        coords: [76.9920, 28.5120],
        title: "Mega Urban Residential & Highway Corridor",
        description: "Rapidly expanding 8-lane expressway corridor with 50+ residential high-rise township clusters under active construction.",
        changeType: "Agrarian Plains → Multi-Tier High-Rise Township",
        ndvi: 0.10,
        ndbi: 0.39,
        mndwi: -0.18,
        deltaNdbi: +0.36,
        deltaNdvi: -0.22,
        areaHectares: 42.5,
        confidence: 0.96,
        recommendation: "Track monthly impervious surface progression and bare-soil conversion.",
        cityName: "Delhi NCR",
      },
      {
        name: "Yamuna Floodplain & Biodiversity Zone",
        category: "water",
        coords: [77.2650, 28.6250],
        title: "Active River Floodplain & Wetlands",
        description: "Active riparian floodplain of the Yamuna River. Seasonal sandbar shifting, water channel meanders, and wetland restoration buffers.",
        changeType: "Seasonal Hydrological Dynamics",
        ndvi: 0.32,
        ndbi: -0.12,
        mndwi: 0.41,
        deltaNdvi: +0.05,
        areaHectares: 64.0,
        confidence: 0.95,
        recommendation: "Flag illegal construction within the active 100-year flood zone.",
        cityName: "Delhi NCR",
      },
      {
        name: "Noida Sector 62 & Expressway Tech Belt",
        category: "infrastructure",
        coords: [77.3650, 28.6280],
        title: "IT SEZ, Data Centers & Institutional Grid",
        description: "Planned sector grid with hyperscale data centers, software export campuses, and wide transport arteries.",
        changeType: "Planned Urban Technology Sector",
        ndvi: 0.15,
        ndbi: 0.36,
        mndwi: -0.16,
        deltaNdbi: +0.24,
        areaHectares: 22.0,
        confidence: 0.94,
        recommendation: "Monitor data center thermal emissions and roof solar arrays.",
        cityName: "Delhi NCR",
      },
      {
        name: "Southern Delhi Ridge Forest Reserve",
        category: "vegetation_gain",
        coords: [77.1650, 28.5150],
        title: "Ancient Aravalli Green Lungs of Delhi",
        description: "Dense Prosopis and indigenous Anogeissus forest cover (NDVI = 0.46) acting as a natural dust and temperature barrier.",
        changeType: "Protected Aravalli Forest Sanctuary",
        ndvi: 0.46,
        ndbi: -0.22,
