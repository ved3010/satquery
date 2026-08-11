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
