"use client";

import { useEffect, useRef, useState } from "react";
import * as maplibregl from "maplibre-gl";
import type { Map as MapLibreMap, GeoJSONSource } from "maplibre-gl";
import { Satellite, Layers, ZoomIn, ZoomOut, Play, Pause, Compass, MapPin, Sparkles, Eye, Activity, Crop } from "lucide-react";
import type { DetectedFeaturePoint } from "@/lib/spatialAnalysis";
import { PointInspectorHud } from "./PointInspectorHud";

export type SensorLayer = "optical" | "sar" | "ndvi" | "night" | "tactical";

export type TargetPreset = {
  name: string;
  region: string;
  coords: [number, number]; // [lng, lat]
  bbox: number[]; // [w, s, e, n]
  zoom: number;
  pitch: number;
  description: string;
};

export const TARGET_PRESETS: TargetPreset[] = [
  {
    name: "Bengaluru Tech Corridor",
    region: "Karnataka, India",
    coords: [77.5946, 12.9716],
    bbox: [77.48, 12.85, 77.72, 13.08],
    zoom: 12.0,
    pitch: 48,
    description: "Silicon Valley of India · Whitefield, Electronic City & Lake Catchments",
  },
  {
    name: "Delhi NCR Agglomeration",
    region: "National Capital Region, India",
    coords: [77.2090, 28.6139],
    bbox: [76.95, 28.40, 77.45, 28.85],
    zoom: 11.5,
    pitch: 50,
    description: "Cyber City Gurgaon, Dwarka Expressway & Yamuna Floodplains",
  },
  {
    name: "Mumbai Coastal Peninsula",
    region: "Maharashtra, India",
    coords: [72.8777, 19.0760],
    bbox: [72.76, 18.88, 73.02, 19.25],
    zoom: 11.8,
    pitch: 54,
    description: "BKC Financial Core, Navi Mumbai Airport & Coastal Reclamation",
  },
  {
    name: "Hyderabad Cyberabad",
    region: "Telangana, India",
    coords: [78.4867, 17.3850],
    bbox: [78.30, 17.25, 78.62, 17.55],
    zoom: 12.0,
    pitch: 50,
    description: "HITEC City, Gachibowli Financial District & Genome Valley",
  },
  {
    name: "Ahmedabad & GIFT City",
    region: "Gujarat, India",
    coords: [72.5714, 23.0225],
    bbox: [72.48, 22.95, 72.68, 23.18],
    zoom: 12.5,
    pitch: 52,
    description: "GIFT City FinTech SEZ, SG Highway & Sabarmati Riverfront",
  },
  {
    name: "Chennai OMR & Ports",
    region: "Tamil Nadu, India",
    coords: [80.2707, 13.0827],
    bbox: [80.12, 12.85, 80.32, 13.20],
    zoom: 12.0,
    pitch: 48,
    description: "OMR IT Expressway, Sriperumbudur Auto Hub & Pallikaranai Marsh",
  },
  {
    name: "Kolkata & New Town",
    region: "West Bengal, India",
    coords: [88.3639, 22.5726],
    bbox: [88.22, 22.42, 88.52, 22.70],
    zoom: 12.0,
    pitch: 50,
    description: "New Town Smart Action Areas, Salt Lake Sector V & Ramsar Wetlands",
  },
  {
    name: "Pune & Hinjawadi SEZ",
    region: "Maharashtra, India",
    coords: [73.8567, 18.5204],
    bbox: [73.72, 18.42, 73.98, 18.64],
    zoom: 12.2,
    pitch: 50,
    description: "Hinjawadi IT Park, Chakan Auto Cluster & Magarpatta Township",
  },
  {
    name: "Sundarbans Mangrove Delta",
    region: "West Bengal, India",
    coords: [88.8535, 21.9497],
    bbox: [88.65, 21.80, 89.05, 22.10],
    zoom: 11.2,
    pitch: 45,
    description: "Tidal mangrove biomes, sediment dynamics & cyclone buffers",
  },
  {
    name: "Jaisalmer Thar Desert",
    region: "Rajasthan, India",
    coords: [70.9167, 26.9157],
    bbox: [70.75, 26.80, 71.05, 27.05],
    zoom: 11.8,
    pitch: 48,
    description: "Bhadla Solar Park perimeter & hyper-arid sand dune ridges",
  },
  {
    name: "Kochi Port & Vembanad",
    region: "Kerala, India",
    coords: [76.2673, 9.9312],
    bbox: [76.18, 9.85, 76.35, 10.02],
    zoom: 12.2,
    pitch: 50,
    description: "Deepwater container terminals & Vembanad backwater lagoons",
  },
  {
    name: "Ladakh Cold Desert (Leh)",
    region: "Ladakh, India",
    coords: [77.5771, 34.1526],
    bbox: [77.45, 34.05, 77.70, 34.25],
    zoom: 11.8,
    pitch: 58,
    description: "Trans-Himalayan glaciated valley & Indus River agricultural oasis",
  },
];

const LAYER_CONFIGS: Record<SensorLayer, { name: string; url: string; maxZoom: number; desc: string }> = {
  optical: {
    name: "Optical RGB (Sentinel-2)",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    maxZoom: 18,
    desc: "10 m Copernicus Sentinel-2 MSI Surface Reflectance",
  },
  sar: {
