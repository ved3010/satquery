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

    setBusy("fetch");
    try {
      const r = await api.aoiFetch({
        bbox: targetBbox,
        start: yearAgo(1),
        end: today(),
        max_cloud: 25,
        want_sar: false,
      });

      if (r.images && r.images.length > 0) {
        setImages(r.images);
        setScenes(r.scenes);
        // Automatically attach the acquired satellite image to the Gemini chatbox
        setCurrentAttachedImage(r.images[0]);
      }
    } catch (e) {
      console.warn("Satellite fetch notice:", e);
    } finally {
      setBusy(null);
    }
  };

  // Acquire imagery on initial mount
  useEffect(() => {
    if (bbox && images.length === 0) {
      void fetchAoi(bbox);
    }
  }, []);

  // Handle clicking anywhere on the 3D globe
  const handleMapClick = async (coords: [number, number]) => {
    const [lon, lat] = coords;
    setFlyToCoords(coords);
    const newBbox = [
      Number((lon - 0.02).toFixed(5)),
      Number((lat - 0.02).toFixed(5)),
      Number((lon + 0.02).toFixed(5)),
      Number((lat + 0.02).toFixed(5)),
    ];
    setBbox(newBbox);

    const point = inspectSingleCoordinate(coords, newBbox, latestTrace?.analysis);
    setSelectedFeaturePoint(point);

    const briefing = await reverseGeocodeLocation(lat, lon);
    setSelectedLocation(briefing);

    // Fetch satellite image for clicked spot and attach to chatbox
    void fetchAoi(newBbox);
  };

  // Handle selecting a location from the search bar
  const handleSelectLocation = (loc: LocationBriefing) => {
    setSelectedLocation(loc);
    setBbox(loc.bbox);
    setFlyToCoords(loc.coords);
    setSelectedFeaturePoint(null);

    // Automatically fetch real satellite imagery and attach to chatbox
    void fetchAoi(loc.bbox);
  };

  // Handle uploading custom image (.tif, .png, .jpg)
  const handleUploadImage = async (file: File) => {
    setBusy("upload");
    try {
      const res = await api.upload(file);
      const newImg: ImageRef = {
        path: res.path,
        modality: (res.modality as "optical" | "sar") || "optical",
        date: today(),
        role: `Uploaded (${res.filename})`,
        preview: api.previewUrl(res.path),
      };
      setImages((prev) => [newImg, ...prev]);
      setCurrentAttachedImage(newImg);
    } catch (e) {
      console.error("Upload error:", e);
    } finally {
      setBusy(null);
    }
  };

  // Run natural language question against attached satellite image in Gemini chat style
  const handleRunQuery = async (queryText: string, imagesToUse: ImageRef[]) => {
    const trimmed = queryText.trim();
    if (!trimmed) return;

    const targetImages = imagesToUse.length > 0 ? imagesToUse : (currentAttachedImage ? [currentAttachedImage] : images.slice(0, 1));
    if (targetImages.length === 0) {
      // Add assistant warning message
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          role: "user",
          text: trimmed,
          timestamp: formatTime(),
        },
        {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          text: "Please search a location or click anywhere on the 3D globe to acquire a satellite scene before asking.",
          timestamp: formatTime(),
          isError: true,
        },
      ]);
      setQueryInput("");
      return;
    }

    // 1. Add User Message with attached image
    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      text: trimmed,
      timestamp: formatTime(),
      attachedImages: targetImages,
      locationName: selectedLocation?.name,
    };

    setMessages((prev) => [...prev, userMsg]);
    setQueryInput("");
    setBusy("query");

    // 2. Query AI backend
    try {
      const res = await api.query(trimmed, targetImages);
      setLatestTrace(res);

      const assistantMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        text: res.answer || "Analysis complete.",
        timestamp: formatTime(),
        trace: res,
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : String(e);
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          text: `Query error: ${errorMsg}. Please try rephrasing or selecting another region.`,
          timestamp: formatTime(),
          isError: true,
        },
      ]);
    } finally {
      setBusy(null);
    }
  };

  return (
    <>
      <Nav />
      <main className="relative min-h-screen pt-[60px] text-white flex flex-col overflow-hidden">
        <Starfield />

        {/* Immersive Full-Screen 3D Earth Globe Canvas (Spans full viewport behind the glass chatbox!) */}
        <div className="fixed inset-0 top-[60px] w-full h-[calc(100vh-60px)] z-0 bg-transparent overflow-hidden">
          <GodsEyeGlobe
            bbox={bbox}
            onBboxChange={(newBbox) => {
              setBbox(newBbox);
              void fetchAoi(newBbox);
            }}
            activeLayer={activeLayer}
            onLayerChange={setActiveLayer}
            isScanning={busy === "fetch"}
            flyToTarget={flyToCoords}
            onMapClick={handleMapClick}
            detectedFeatures={detectedFeatures}
            selectedFeaturePoint={selectedFeaturePoint}
            onSelectFeaturePoint={setSelectedFeaturePoint}
            onAskAboutPoint={(q) => {
              setQueryInput(q);
            }}
          />
        </div>

        {/* Floating Glassmorphic UI Layer (Z-10) */}
        <div className="relative z-10 flex flex-col justify-between h-[calc(100vh-60px)] pointer-events-none px-4 sm:px-6 pt-3 pb-3 max-w-[1400px] mx-auto w-full">
          {/* Top Controls: Target Status + Glass Search Bar */}
          <div className="w-full max-w-[880px] mx-auto space-y-2 pointer-events-auto">
            {/* Top Bar Status */}
            <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2 rounded-2xl bg-black/40 backdrop-blur-xl border border-white/15 shadow-lg">
              <div className="flex items-center gap-2.5">
                <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                <h1 className="text-[13.5px] font-semibold tracking-tight text-white flex items-center gap-2">
                  <span>Console</span>
                  <span className="text-white/30">/</span>
                  <span className="text-cyan-300 font-normal">
                    {selectedLocation?.name || "Global Orbit"}
                  </span>
                </h1>
                {selectedLocation?.state && (
                  <span className="hidden sm:inline-block px-2 py-0.5 rounded text-[10.5px] font-mono bg-white/10 text-white/70 border border-white/15">
                    {selectedLocation.state}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                {matchedCctv && (
                  <button
                    type="button"
                    onClick={() => setIsDualCockpitOpen(true)}
                    className="flex items-center gap-1.5 px-3 py-1 rounded-full border border-red-500/40 bg-red-600/30 text-[11px] text-red-200 font-mono hover:bg-red-600/50 transition-all shadow-[0_0_15px_rgba(239,68,68,0.3)] animate-pulse"
                    title="View live street CCTV camera footage side-by-side with satellite view"
                  >
                    <Video className="w-3.5 h-3.5 text-red-400" />
                    <span className="font-bold">LIVE STREET CCTV</span>
                  </button>
                )}

                {backend.kind === "up" ? (
                  <div className="flex items-center gap-2 px-2.5 py-0.5 rounded-full border border-emerald-500/30 bg-emerald-950/30 text-[10.5px] text-emerald-300 font-mono">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span>ONLINE ({backend.health.models_registered} MODELS)</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 px-2.5 py-0.5 rounded-full border border-amber-500/30 bg-amber-950/30 text-[10.5px] text-amber-300 font-mono">
                    <AlertTriangle className="w-3 h-3 text-amber-400" />
                    <span>CONNECTING</span>
                  </div>
                )}
              </div>
            </div>

            {/* Frosted Glass Location Search */}
            <LocationSearch
              selectedLocation={selectedLocation}
              onSelectLocation={handleSelectLocation}
              onSetQueryPrompt={(q) => setQueryInput(q)}
            />
          </div>

          {/* Center Space - Free for globe interaction (clicks pass through to Earth canvas) */}
          <div className="flex-1 pointer-events-none" />

          {/* Floating Glassmorphic Gemini Chatbox (Earth clearly visible through it!) */}
          <div className="w-full max-w-[880px] mx-auto pointer-events-auto max-h-[380px] sm:max-h-[420px] flex flex-col mt-2">
            <GeminiChatBox
              currentImage={currentAttachedImage}
              availableImages={images}
              onSelectImage={setCurrentAttachedImage}
              onClearAttachedImage={() => setCurrentAttachedImage(null)}
              onUploadImage={handleUploadImage}
              onRunQuery={handleRunQuery}
              isQuerying={busy === "query"}
              isFetchingImage={busy === "fetch"}
              selectedLocationName={selectedLocation?.name}
              messages={messages}
              onClearMessages={() => setMessages([])}
              queryInput={queryInput}
              setQueryInput={setQueryInput}
              hasCctvFeed={!!matchedCctv}
              onOpenDualCockpit={() => setIsDualCockpitOpen(true)}
            />
          </div>
        </div>

        {/* Dual Orbit-to-Ground Side-by-Side Surveillance Cockpit Modal */}
        {isDualCockpitOpen && matchedCctv && (
          <DualSurveillanceCockpit
            cctvFeed={matchedCctv}
            satelliteImage={currentAttachedImage || (images.length > 0 ? images[0] : null)}
            locationName={selectedLocation?.name || "Pune"}
            coords={(flyToCoords || selectedLocation?.coords || [73.8567, 18.5018]) as [number, number]}
            onClose={() => setIsDualCockpitOpen(false)}
          />
        )}
      </main>
    </>
  );
}
