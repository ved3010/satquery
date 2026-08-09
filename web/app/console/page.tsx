"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Nav, Starfield } from "@/components/Chrome";
import { GodsEyeGlobe, SensorLayer } from "@/components/console/GodsEyeGlobe";
import { LocationSearch } from "@/components/console/LocationSearch";
import { GeminiChatBox, type ChatMessage } from "@/components/console/GeminiChatBox";
import { reverseGeocodeLocation, type LocationBriefing } from "@/lib/geocoding";
import {
  extractSpatialFeatures,
  inspectSingleCoordinate,
  type DetectedFeaturePoint,
  type SpatialAnalysisResult,
} from "@/lib/spatialAnalysis";
import {
  api,
  type Health,
  type ImageRef,
  type Model,
  type Scene,
  type Trace,
} from "@/lib/api";
import { AlertTriangle, Satellite, Sparkles, MapPin, Video } from "lucide-react";
import { DualSurveillanceCockpit } from "@/components/console/DualSurveillanceCockpit";
import { getMatchedCctvFeed, type GroundCctvFeed } from "@/lib/puneCctvFeeds";

type Backend =
  | { kind: "checking" }
  | { kind: "down"; error: string }
  | { kind: "up"; health: Health; models: Model[] };

const today = () => new Date().toISOString().slice(0, 10);
const yearAgo = (n: number) => {
  const d = new Date();
  d.setFullYear(d.getFullYear() - n);
  return d.toISOString().slice(0, 10);
};

const formatTime = () => {
  return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
};

export default function ConsolePage() {
  const [backend, setBackend] = useState<Backend>({ kind: "checking" });

  // Selected Location State - Default to Pune Swargate
  const [selectedLocation, setSelectedLocation] = useState<LocationBriefing | null>({
    name: "Pune Swargate",
    state: "Maharashtra",
    type: "Transit & Urban Hub",
    coords: [73.8567, 18.5018],
    bbox: [73.82, 18.47, 73.89, 18.54],
    zoom: 13,
    pitch: 45,
    climateZone: "Tropical Wet & Dry",
    terrainType: "Deccan Plateau & River Basin",
    landCoverSummary: "Dense urban transit hub, canal buffer, and residential density.",
    recommendedSensor: "Sentinel-2 MSI (Optical)",
    suggestedQuestions: [
