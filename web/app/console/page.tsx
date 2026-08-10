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
      "What is the detailed land-cover breakdown (built-up, vegetation, water, bare) across Pune Swargate?",
    ],
    ecologicalSignificance: "Major transport node and Mutha River canal basin.",
  });

  const [flyToCoords, setFlyToCoords] = useState<[number, number] | null>([73.8567, 18.5018]);
  const [selectedFeaturePoint, setSelectedFeaturePoint] = useState<DetectedFeaturePoint | null>(null);

  // Satellite Imagery State
  const [images, setImages] = useState<ImageRef[]>([]);
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [currentAttachedImage, setCurrentAttachedImage] = useState<ImageRef | null>(null);
  const [bbox, setBbox] = useState<number[] | null>([73.82, 18.47, 73.89, 18.54]);
  const [busy, setBusy] = useState<null | "fetch" | "upload" | "query">(null);
  const [activeLayer, setActiveLayer] = useState<SensorLayer>("optical");

  // Conversational Chat Messages
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [queryInput, setQueryInput] = useState<string>("");
  const [latestTrace, setLatestTrace] = useState<Trace | null>(null);

  // Live Street CCTV state for Pune and urban hubs
  const [isDualCockpitOpen, setIsDualCockpitOpen] = useState(false);

  // Match live street CCTV feed for targeted location
  const matchedCctv: GroundCctvFeed | null = useMemo(() => {
    return getMatchedCctvFeed(
      selectedLocation?.name || "",
      (flyToCoords || selectedLocation?.coords) as [number, number] | undefined
    );
  }, [selectedLocation, flyToCoords]);

  // Spatial features for map visualization
  const spatialResult: SpatialAnalysisResult | null = useMemo(() => {
    if (!bbox) return null;
    return extractSpatialFeatures(bbox, latestTrace?.analysis, queryInput);
  }, [bbox, latestTrace?.analysis, queryInput]);

  const detectedFeatures = spatialResult?.features ?? [];

  // Check Backend Health
  const loadBackend = useCallback(async () => {
    setBackend({ kind: "checking" });
    try {
      const [health, models] = await Promise.all([api.health(), api.models()]);
      setBackend({ kind: "up", health, models });
    } catch (e) {
      setBackend({ kind: "down", error: e instanceof Error ? e.message : String(e) });
    }
  }, []);

  useEffect(() => {
    void loadBackend();
  }, [loadBackend]);

  // Fetch live Sentinel imagery for a given bbox
  const fetchAoi = async (customBbox?: number[]) => {
    const targetBbox = customBbox || bbox;
    if (!targetBbox) return;

