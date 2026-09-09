"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import {
  Satellite,
  Layers,
  Sparkles,
  Download,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Cloud,
  Cpu,
  Send,
  Radio,
  MapPin,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  RotateCcw,
  Sliders,
  Eye,
  Check,
  Copy,
  Upload,
  SplitSquareVertical,
  Columns,
  Grid,
  ChevronRight,
  ImageIcon,
} from "lucide-react";
import {
  type ImageRef,
  type Scene,
  type Trace,
  getPreviewUrl,
  EXAMPLE_QUERIES,
  api,
} from "@/lib/api";
import type { LocationBriefing } from "@/lib/geocoding";
import type { DetectedFeaturePoint } from "@/lib/spatialAnalysis";

interface SelectedImageInspectorProps {
  images: ImageRef[];
  scenes: Scene[];
  bbox: number[] | null;
  selectedLocation: LocationBriefing | null;
  selectedFeaturePoint: DetectedFeaturePoint | null;
  onFetchAoi: () => Promise<void>;
  isFetching: boolean;
  onRunQuery: (customQuery?: string, imagesToUse?: ImageRef[]) => Promise<void>;
  isQuerying: boolean;
  trace: Trace | null;
  query: string;
  setQuery: (q: string) => void;
  onSelectCoords?: (coords: [number, number]) => void;
  onUploadImage?: (file: File) => Promise<void>;
}

type SpectralBandMode = "rgb" | "cir" | "swir" | "ndvi";
type ViewLayoutMode = "single" | "split" | "side-by-side";

export function SelectedImageInspector({
  images,
  scenes,
  bbox,
  selectedLocation,
  selectedFeaturePoint,
  onFetchAoi,
  isFetching,
  onRunQuery,
  isQuerying,
  trace,
  query,
  setQuery,
  onSelectCoords,
  onUploadImage,
}: SelectedImageInspectorProps) {
  // Band mode: Natural RGB, False Color Infrared (CIR), SWIR, NDVI
  const [bandMode, setBandMode] = useState<SpectralBandMode>("rgb");

  // Selected active image index
  const [activeImageIdx, setActiveImageIdx] = useState<number>(0);

  // Layout mode for bi-temporal imagery
  const [layoutMode, setLayoutMode] = useState<ViewLayoutMode>("single");

  // Split-slider position (0 to 100%)
  const [sliderPos, setSliderPos] = useState<number>(50);
  const isDraggingSlider = useRef<boolean>(false);

  // Zoom & Pan state
  const [zoom, setZoom] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState<boolean>(false);
  const panStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Fullscreen expansion
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [copiedAnswer, setCopiedAnswer] = useState<boolean>(false);
  const [isUploading, setIsUploading] = useState<boolean>(false);

  // File input ref
  const fileInputRef = useRef<HTMLInputElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);

  // Keep activeImageIdx in bounds when images list changes
  useEffect(() => {
    if (activeImageIdx >= images.length) {
      setActiveImageIdx(0);
    }
  }, [images.length, activeImageIdx]);

  // Current active image
  const activeImage: ImageRef | null = images[activeImageIdx] || images[0] || null;

  // Primary & Baseline for bi-temporal
  const primaryImage = images.length > 0 ? images[0] : null;
  const baselineImage = images.length > 1 ? images[1] : null;
  const isBiTemporal = images.length >= 2;

  // Scene metadata
  const primaryScene = scenes.length > 0 ? scenes[0] : null;

  // Calculate approximate AOI Area in km²
  const aoiAreaKm2 = useMemo(() => {
    if (!bbox || bbox.length !== 4) return null;
    const [west, south, east, north] = bbox;
    const latMid = (south + north) / 2;
    const kmPerDegLat = 111.0;
    const kmPerDegLon = 111.0 * Math.cos((latMid * Math.PI) / 180);
    const widthKm = Math.abs(east - west) * kmPerDegLon;
    const heightKm = Math.abs(north - south) * kmPerDegLat;
    return (widthKm * heightKm).toFixed(2);
  }, [bbox]);

  // Center coordinate
  const centerCoords = useMemo(() => {
    if (!bbox || bbox.length !== 4) return null;
    const [west, south, east, north] = bbox;
    return [
      Number(((west + east) / 2).toFixed(5)),
      Number(((south + north) / 2).toFixed(5)),
    ] as [number, number];
  }, [bbox]);

  // Handle zoom
  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 0.35, 3.5));
  const handleZoomOut = () => setZoom((prev) => Math.max(prev - 0.35, 0.75));
  const handleResetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  // Handle panning
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    setIsPanning(true);
    panStartRef.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDraggingSlider.current && viewportRef.current) {
      const rect = viewportRef.current.getBoundingClientRect();
      const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
      setSliderPos((x / rect.width) * 100);
      return;
    }
    if (!isPanning) return;
    setPan({
      x: e.clientX - panStartRef.current.x,
      y: e.clientY - panStartRef.current.y,
    });
  };

  const handleMouseUp = () => {
    setIsPanning(false);
    isDraggingSlider.current = false;
  };

  // Copy agent answer
  const copyAnswer = () => {
    if (trace?.answer) {
      navigator.clipboard.writeText(trace.answer);
      setCopiedAnswer(true);
      setTimeout(() => setCopiedAnswer(false), 2000);
    }
  };

  // Handle query submit
  const handleQuerySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || isQuerying) return;
    const imagesToQuery = activeImage ? [activeImage] : images;
    void onRunQuery(undefined, imagesToQuery);
  };

  // File upload handler
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    try {
      if (onUploadImage) {
        await onUploadImage(file);
      }
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // Quick prompt presets
  const quickPrompts = [
    {
      label: "Land-Cover Classification",
      prompt: "What is the detailed land-cover breakdown (water, vegetation, built-up, bare land) across this scene?",
    },
    {
      label: "Urban Infrastructure",
      prompt: "Identify major built-up zones, transportation corridors, and structural density in this image.",
    },
    {
      label: "Water Bodies & Hydrology",
      prompt: "Detect and quantify surface water bodies, canals, and moisture index across this satellite scene.",
    },
    {
      label: "Vegetation Canopy & NDVI",
      prompt: "Analyze vegetation canopy vitality, green space distribution, and agricultural health.",
    },
    ...(isBiTemporal
      ? [
          {
            label: "Temporal Change Detection",
            prompt: "What changes occurred between the baseline and recent observation dates, and where did the change happen?",
          },
        ]
      : []),
  ];

  return (
    <section
      id="selected-satellite-inspector"
      className={`relative rounded-2xl border border-[var(--color-line)] bg-black/85 backdrop-blur-2xl transition-all duration-300 shadow-[0_12px_40px_rgba(0,0,0,0.7)] ${
        isFullscreen
          ? "fixed inset-3 z-50 overflow-y-auto border-[var(--color-brand)]"
          : "panel overflow-hidden"
      }`}
    >
      {/* Hidden File Input for Image Upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".tif,.tiff,.png,.jpg,.jpeg,.npz"
        onChange={handleFileUpload}
        className="hidden"
      />

      {/* Top Header Bar: Location Title, Active Image, and Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[var(--color-line)] p-4 sm:px-6 gap-3 bg-white/[0.02]">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--color-brand)]/50 bg-[var(--color-brand)]/15 text-[var(--color-brand-soft)] shadow-[0_0_16px_rgba(47,123,240,0.3)] shrink-0">
            <Satellite className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="mono text-[10.5px] font-bold uppercase tracking-[0.16em] text-[var(--color-brand-soft)]">
                Selected Satellite Scene
              </span>
              <span className="flex items-center gap-1 rounded-full bg-emerald-950/60 border border-emerald-500/40 px-2 py-0.5 text-[9.5px] font-medium text-emerald-300 mono">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                {images.length > 0 ? "LIVE PIXELS LOADED" : "SELECT IMAGE"}
              </span>
            </div>
            <h2 className="text-[17px] font-semibold text-white flex items-center gap-2">
              {selectedLocation?.name || "Custom Satellite Scene"}{" "}
              {selectedLocation?.state ? `· ${selectedLocation.state}` : ""}
              {selectedFeaturePoint ? (
                <span className="text-[12px] font-normal text-[var(--color-mute)]">
                  ({selectedFeaturePoint.name})
                </span>
              ) : null}
            </h2>
          </div>
        </div>

        {/* Telemetry Chips & Action Buttons */}
        <div className="flex flex-wrap items-center gap-2 mono text-[11px]">
          {centerCoords && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-[var(--color-line)] bg-white/5 text-white/90">
              <MapPin className="w-3.5 h-3.5 text-[var(--color-brand)]" />
              <span>
                {centerCoords[1]}°N, {centerCoords[0]}°E
              </span>
            </div>
          )}

          {aoiAreaKm2 && (
            <div className="px-2.5 py-1 rounded-lg border border-[var(--color-line)] bg-white/5 text-[var(--color-mute)]">
              Area: <span className="text-white font-medium">{aoiAreaKm2} km²</span>
            </div>
          )}

          <div className="px-2.5 py-1 rounded-lg border border-[var(--color-line)] bg-white/5 text-[var(--color-mute)]">
            GSD: <span className="text-white font-medium">10 m / px</span>
          </div>

          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="px-2.5 py-1 rounded-lg border border-white/20 bg-white/5 hover:bg-white/10 text-white transition flex items-center gap-1.5 mono text-[11px]"
            title="Upload any local GeoTIFF or satellite image (.tif, .png, .jpg)"
          >
            <Upload className={`w-3.5 h-3.5 ${isUploading ? "animate-spin" : ""}`} />
            <span>{isUploading ? "Uploading..." : "Upload Image"}</span>
          </button>

          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-1.5 rounded-lg border border-[var(--color-line)] bg-white/5 hover:bg-white/10 text-white transition"
            title={isFullscreen ? "Exit Fullscreen" : "Fullscreen View"}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      {/* Available Passes for Selected Area */}
      {images.length > 1 && (
        <div className="p-2.5 px-4 sm:px-6 border-b border-[var(--color-line)] bg-white/[0.01] flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="mono text-[10.5px] uppercase tracking-wider text-[var(--color-mute)] flex items-center gap-1.5">
              <ImageIcon className="w-3.5 h-3.5 text-[var(--color-brand-soft)]" />
              Observed Passes for Selected Area:
            </span>
            <div className="flex items-center gap-1.5">
              {images.map((img, idx) => (
                <button
                  key={img.path}
                  onClick={() => {
                    setActiveImageIdx(idx);
                    setLayoutMode("single");
                  }}
                  className={`px-3 py-1 rounded-lg mono text-[11px] transition flex items-center gap-1.5 border ${
                    activeImageIdx === idx && layoutMode === "single"
                      ? "bg-[var(--color-brand)]/20 border-[var(--color-brand)] text-white shadow-[0_0_12px_rgba(47,123,240,0.3)] font-medium"
                      : "bg-black/50 border-[var(--color-line)] text-[var(--color-mute)] hover:text-white"
                  }`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <span>{img.role || (idx === 0 ? "T1 Recent Pass" : "T0 Earlier Baseline")}</span>
                  {img.date && <span className="opacity-70">({img.date})</span>}
                </button>
              ))}
            </div>
          </div>

          <div className="mono text-[10px] text-[var(--color-mute)] hidden sm:block">
            CLICK A PASS TO VIEW
          </div>
        </div>
      )}
      </div>

      {/* Main Grid: Visual Image Viewer (Left) & Integrated Interrogation Terminal (Right) */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-0">
        {/* Left (7 Cols): Satellite Image Viewport & Band Controls */}
        <div className="xl:col-span-7 flex flex-col border-b xl:border-b-0 xl:border-r border-[var(--color-line)] bg-black/70">
          {/* Subheader Toolbar: Multi-Spectral Bands & Zoom Controls */}
          <div className="flex flex-wrap items-center justify-between p-3 px-4 border-b border-[var(--color-line)] bg-white/[0.01] gap-2">
            {/* Spectral Band Selector */}
            <div className="flex items-center gap-1.5 bg-black/80 p-1 rounded-lg border border-[var(--color-line)]">
              <span className="mono text-[10px] text-[var(--color-mute)] px-1.5 font-medium uppercase">
                Band:
              </span>
              <button
                onClick={() => setBandMode("rgb")}
                className={`px-2.5 py-1 rounded text-[11px] mono font-medium transition ${
                  bandMode === "rgb"
                    ? "bg-[var(--color-brand)] text-white shadow-[0_0_10px_rgba(47,123,240,0.3)]"
                    : "text-[var(--color-mute)] hover:text-white"
                }`}
                title="Natural True Color (Sentinel-2 B4-B3-B2)"
              >
                Natural RGB
              </button>
              <button
                onClick={() => setBandMode("cir")}
                className={`px-2.5 py-1 rounded text-[11px] mono font-medium transition ${
                  bandMode === "cir"
                    ? "bg-rose-600 text-white shadow-[0_0_10px_rgba(225,29,72,0.3)]"
                    : "text-[var(--color-mute)] hover:text-white"
                }`}
                title="Color Infrared (NIR-Red-Green: Vegetation & Chlorophyll)"
              >
                CIR Infrared
              </button>
              <button
                onClick={() => setBandMode("swir")}
                className={`px-2.5 py-1 rounded text-[11px] mono font-medium transition ${
                  bandMode === "swir"
                    ? "bg-amber-600 text-white shadow-[0_0_10px_rgba(217,119,6,0.3)]"
                    : "text-[var(--color-mute)] hover:text-white"
                }`}
                title="Short-Wave Infrared (B12-B8-B4: Urban & Soil Moisture)"
              >
                SWIR Urban
              </button>
              <button
                onClick={() => setBandMode("ndvi")}
                className={`px-2.5 py-1 rounded text-[11px] mono font-medium transition ${
                  bandMode === "ndvi"
                    ? "bg-emerald-600 text-white shadow-[0_0_10px_rgba(5,150,105,0.3)]"
                    : "text-[var(--color-mute)] hover:text-white"
                }`}
                title="NDVI Spectral Heatmap (Vegetation Canopy Index)"
              >
                NDVI Heatmap
              </button>
            </div>

            {/* Layout Mode (Only active when 2 images available) */}
            {isBiTemporal && (
              <div className="flex items-center gap-1 bg-black/80 p-1 rounded-lg border border-[var(--color-line)]">
                <button
                  onClick={() => setLayoutMode("single")}
                  className={`px-2 py-1 rounded text-[11px] mono transition flex items-center gap-1 ${
                    layoutMode === "single" ? "bg-white/20 text-white" : "text-[var(--color-mute)] hover:text-white"
                  }`}
                  title="Single View"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Single</span>
                </button>
                <button
                  onClick={() => setLayoutMode("split")}
                  className={`px-2 py-1 rounded text-[11px] mono transition flex items-center gap-1 ${
                    layoutMode === "split"
                      ? "bg-[var(--color-brand)] text-white"
                      : "text-[var(--color-mute)] hover:text-white"
                  }`}
                  title="Split Wipe Slider"
                >
                  <SplitSquareVertical className="w-3.5 h-3.5" />
                  <span>Split Slider</span>
                </button>
                <button
                  onClick={() => setLayoutMode("side-by-side")}
                  className={`px-2 py-1 rounded text-[11px] mono transition flex items-center gap-1 ${
                    layoutMode === "side-by-side"
                      ? "bg-[var(--color-brand)] text-white"
                      : "text-[var(--color-mute)] hover:text-white"
                  }`}
                  title="Side-by-Side Comparison"
                >
                  <Columns className="w-3.5 h-3.5" />
                  <span>Side-by-Side</span>
                </button>
              </div>
            )}

            {/* Viewport Zoom & Pan Controls */}
            <div className="flex items-center gap-1 bg-black/80 p-1 rounded-lg border border-[var(--color-line)]">
              <button
                onClick={handleZoomIn}
                className="p-1 rounded hover:bg-white/10 text-[var(--color-mute)] hover:text-white transition"
                title="Zoom In"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
              <span className="mono text-[10px] text-white px-1.5 tabular-nums">
                {Math.round(zoom * 100)}%
              </span>
              <button
                onClick={handleZoomOut}
                className="p-1 rounded hover:bg-white/10 text-[var(--color-mute)] hover:text-white transition"
                title="Zoom Out"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={handleResetView}
                className="p-1 rounded hover:bg-white/10 text-[var(--color-mute)] hover:text-white transition ml-0.5"
                title="Reset View"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Interactive Viewport Area */}
          <div
            ref={viewportRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            className="relative h-[480px] sm:h-[530px] w-full overflow-hidden select-none cursor-grab active:cursor-grabbing bg-[#07090f] flex items-center justify-center"
          >
            {/* Grid Reticle Background */}
            <div className="absolute inset-0 bg-[radial-gradient(#1f293d_1px,transparent_1px)] [background-size:24px_24px] opacity-40 pointer-events-none" />

            {/* Corner Bracket Reticles */}
            <div className="absolute top-3 left-3 w-4 h-4 border-t-2 border-l-2 border-[var(--color-brand)]/60 pointer-events-none" />
            <div className="absolute top-3 right-3 w-4 h-4 border-t-2 border-r-2 border-[var(--color-brand)]/60 pointer-events-none" />
            <div className="absolute bottom-3 left-3 w-4 h-4 border-b-2 border-l-2 border-[var(--color-brand)]/60 pointer-events-none" />
            <div className="absolute bottom-3 right-3 w-4 h-4 border-b-2 border-r-2 border-[var(--color-brand)]/60 pointer-events-none" />

            {/* Display the active selected image */}
            {activeImage ? (
              <div
                className="relative transition-transform duration-75 flex items-center justify-center"
                style={{
                  transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                  transformOrigin: "center center",
                }}
              >
                {/* CASE 1: Split Wipe Slider Mode (if bi-temporal) */}
                {layoutMode === "split" && primaryImage && baselineImage ? (
                  <div className="relative overflow-hidden rounded-xl shadow-2xl border border-[var(--color-line)] max-w-[620px]">
                    {/* Background: Baseline Image (T0) */}
                    <img
                      src={getPreviewUrl(baselineImage, bandMode)}
                      alt="Baseline T0"
                      className="w-full h-auto object-contain block pointer-events-none"
                    />

                    {/* Foreground: Recent Image (T1) clipped by slider */}
                    <div
                      className="absolute inset-0 overflow-hidden"
                      style={{ clipPath: `inset(0 ${100 - sliderPos}% 0 0)` }}
                    >
                      <img
                        src={getPreviewUrl(primaryImage, bandMode)}
                        alt="Recent T1"
                        className="w-full h-auto object-contain block pointer-events-none"
                      />
                    </div>

                    {/* Interactive Divider Line */}
                    <div
                      className="absolute top-0 bottom-0 w-1 bg-white cursor-ew-resize flex items-center justify-center shadow-[0_0_12px_rgba(255,255,255,0.8)]"
                      style={{ left: `${sliderPos}%` }}
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        isDraggingSlider.current = true;
                      }}
                    >
                      <div className="w-6 h-6 rounded-full bg-black/90 border-2 border-white flex items-center justify-center text-[10px] text-white mono font-bold pointer-events-none">
                        ↔
                      </div>
                    </div>

                    {/* Labels */}
                    <div className="absolute bottom-3 left-3 px-2 py-1 rounded bg-black/80 border border-white/20 mono text-[10px] text-white">
                      T1: {primaryImage.date ?? "Recent Pass"}
                    </div>
                    <div className="absolute bottom-3 right-3 px-2 py-1 rounded bg-black/80 border border-white/20 mono text-[10px] text-white">
                      T0: {baselineImage.date ?? "Past Baseline"}
                    </div>
                  </div>
                ) : layoutMode === "side-by-side" && primaryImage && baselineImage ? (
                  /* CASE 2: Side-by-Side Mode */
                  <div className="flex items-center gap-3 p-2">
                    <div className="relative rounded-lg overflow-hidden border border-[var(--color-line)] max-w-[310px]">
                      <img
                        src={getPreviewUrl(baselineImage, bandMode)}
                        alt="T0 Baseline"
                        className="w-full h-auto object-contain block pointer-events-none"
                      />
                      <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-black/80 border border-white/20 mono text-[9.5px] text-white font-medium">
                        BASELINE (T0) · {baselineImage.date}
                      </div>
                    </div>
                    <div className="relative rounded-lg overflow-hidden border border-[var(--color-brand)] max-w-[310px] shadow-[0_0_20px_rgba(47,123,240,0.2)]">
                      <img
                        src={getPreviewUrl(primaryImage, bandMode)}
                        alt="T1 Recent"
                        className="w-full h-auto object-contain block pointer-events-none"
                      />
                      <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-[var(--color-brand)] mono text-[9.5px] text-white font-bold">
                        RECENT (T1) · {primaryImage.date}
                      </div>
                    </div>
                  </div>
                ) : (
                  /* CASE 3: Single Selected Image Mode */
                  <div className="relative rounded-xl overflow-hidden border border-[var(--color-line)] shadow-2xl max-w-[580px]">
                    <img
                      key={`${activeImage.path}_${bandMode}`}
                      src={getPreviewUrl(activeImage, bandMode)}
                      alt="Selected Satellite Imagery"
                      className="w-full h-auto object-contain block pointer-events-none transition-opacity duration-200"
                    />

                    {/* Image Date & Satellite Overlay Tag */}
                    <div className="absolute top-3 left-3 px-2.5 py-1 rounded-lg bg-black/85 border border-white/20 backdrop-blur-md mono text-[10.5px] text-white flex items-center gap-1.5 shadow-lg">
                      <span className="w-2 h-2 rounded-full bg-emerald-400" />
                      <span>
                        {activeImage.role || "Optical Scene"} ·{" "}
                        {activeImage.date || "Sentinel-2 L2A"}
                      </span>
                    </div>

                    {/* Selected Hotspot Marker if in AOI */}
                    {selectedFeaturePoint && (
                      <div
                        className="absolute w-6 h-6 -translate-x-1/2 -translate-y-1/2 border-2 border-amber-400 rounded-full flex items-center justify-center animate-pulse pointer-events-none"
                        style={{ top: "50%", left: "50%" }}
                        title={selectedFeaturePoint.name}
                      >
                        <div className="w-2 h-2 bg-amber-400 rounded-full" />
                        <span className="absolute -bottom-5 px-1.5 py-0.5 rounded bg-black/90 text-amber-300 mono text-[8px] whitespace-nowrap border border-amber-500/40">
                          {selectedFeaturePoint.name}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              /* If no scene is available */
              <div className="relative z-10 max-w-[460px] p-6 text-center space-y-4 rounded-xl border border-[var(--color-brand)]/40 bg-black/80 backdrop-blur-md shadow-[0_0_30px_rgba(47,123,240,0.15)]">
                <div className="w-12 h-12 rounded-full border border-[var(--color-brand)]/60 bg-[var(--color-brand)]/15 text-[var(--color-brand-soft)] flex items-center justify-center mx-auto shadow-[0_0_15px_rgba(47,123,240,0.3)]">
                  <Satellite className={`w-6 h-6 ${isFetching ? "animate-spin" : ""}`} />
                </div>
                <div>
                  <h3 className="text-[16px] font-semibold text-white">
                    {selectedLocation?.name || "Select A Location on the Globe"}
                  </h3>
                  <p className="mt-1 text-[13px] text-[var(--color-mute)] leading-relaxed">
                    {isFetching
                      ? "Acquiring real 10m satellite imagery from orbit for this Indian location..."
                      : "Click any point or draw a bounding box on the 3D globe above, or search any city across India to inspect satellite pixels."}
                  </p>
                </div>

                <button
                  onClick={onFetchAoi}
                  disabled={isFetching || !bbox}
                  className={`w-full py-3 rounded-xl text-[14px] font-semibold tracking-wide transition flex items-center justify-center gap-2 ${
                    isFetching
                      ? "bg-white/10 text-[var(--color-mute)] cursor-wait"
                      : "bg-[var(--color-brand)] hover:bg-[#4b8ef5] text-white shadow-[0_0_20px_rgba(47,123,240,0.4)] cursor-pointer"
                  }`}
                >
                  <Radio className={`w-4 h-4 ${isFetching ? "animate-spin" : ""}`} />
                  {isFetching ? "Acquiring Satellite Imagery..." : "Acquire Satellite Imagery for This Spot"}
                </button>
              </div>
            )}

            {/* Live Orbit Acquisition Scanner Overlay when fetching */}
            {isFetching && (
              <div className="absolute inset-0 z-30 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center space-y-3">
                <div className="relative flex items-center justify-center w-16 h-16">
                  <div className="absolute inset-0 rounded-full border border-[var(--color-brand)]/40 animate-ping" />
                  <div className="absolute inset-2 rounded-full border-2 border-[var(--color-brand)] animate-spin border-t-transparent" />
                  <Satellite className="w-6 h-6 text-[var(--color-brand-soft)] animate-pulse" />
                </div>
                <div className="space-y-1">
                  <div className="mono text-[10.5px] uppercase tracking-widest text-[var(--color-brand-soft)] font-bold">
                    Target Locked · Acquiring Orbit Pass
                  </div>
                  <h4 className="text-[16px] font-semibold text-white">
                    {selectedLocation?.name || "Target Coordinates"}
                  </h4>
                  {centerCoords && (
                    <p className="mono text-[11px] text-[var(--color-mute)]">
                      {centerCoords[1]}°N, {centerCoords[0]}°E · GSD 10m / px
                    </p>
                  )}
                  <p className="text-[11.5px] text-[var(--color-mute)] opacity-80 pt-1">
                    Fetching high-resolution multispectral imagery across India...
                  </p>
                </div>
              </div>
            )}

            {/* Bottom Telemetry HUD Bar */}
            <div className="absolute bottom-2 left-3 right-3 flex items-center justify-between pointer-events-none">
              <div className="px-2.5 py-1 rounded-md bg-black/80 border border-[var(--color-line)] mono text-[10px] text-[var(--color-mute)] backdrop-blur-md">
                SPECTRAL: <span className="text-white font-medium">{bandMode.toUpperCase()}</span> · RES:{" "}
                <span className="text-white font-medium">10M GSD</span>
              </div>

              {primaryScene && (
                <div className="px-2.5 py-1 rounded-md bg-black/80 border border-[var(--color-line)] mono text-[10px] text-[var(--color-mute)] backdrop-blur-md hidden sm:block">
                  SCENE: <span className="text-white">{primaryScene.id.slice(0, 22)}...</span> · CLOUD:{" "}
                  <span className="text-white">{primaryScene.cloud}%</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right (5 Cols): "Ask Anything About This Image" Terminal */}
        <div className="xl:col-span-5 flex flex-col p-5 sm:p-6 space-y-5 bg-black/50">
          <div className="space-y-1.5 border-b border-[var(--color-line)] pb-4">
            <div className="flex items-center justify-between">
              <h3 className="mono text-[11.5px] font-semibold tracking-[0.14em] text-white uppercase flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[var(--color-brand-soft)]" />
                Ask Anything About This Image
              </h3>
              <span className="mono text-[10px] text-[var(--color-mute)]">MULTIMODAL AGENT</span>
            </div>
            <p className="text-[13px] text-[var(--color-mute)] leading-relaxed">
              Interrogate the selected satellite pixels with specialist remote sensing vision models (M1–M7)
              and automated spectral calculus.
            </p>
          </div>

          {/* Question Input Form */}
          <form onSubmit={handleQuerySubmit} className="space-y-3">
            <div className="relative">
              <textarea
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey || !e.shiftKey)) {
                    e.preventDefault();
                    if (query.trim() && !isQuerying) {
                      const imagesToQuery = activeImage ? [activeImage] : images;
                      void onRunQuery(query, imagesToQuery);
                    }
                  }
                }}
                rows={4}
                placeholder="Ask any question about this selected satellite image (e.g. 'What is the proportion of urban built-up area?', 'Detect new construction or vegetation loss', 'What is the water surface fraction?')..."
                className="w-full bg-black/75 border border-[var(--color-line)] focus:border-[var(--color-brand)] rounded-xl p-3.5 text-[14px] text-white outline-none resize-none leading-relaxed transition-all placeholder:text-[var(--color-mute)]/60 shadow-inner focus:shadow-[0_0_20px_rgba(47,123,240,0.2)]"
              />
              <div className="absolute bottom-3 right-3 mono text-[10px] text-[var(--color-mute)] pointer-events-none hidden sm:block">
                Press Enter ↵ to Ask
              </div>
            </div>

            {/* Quick Prompt Chips */}
            <div className="space-y-1.5">
              <span className="mono text-[10px] text-[var(--color-mute)] block uppercase tracking-wider">
                Quick Satellite Inquiries:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {quickPrompts.map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => {
                      setQuery(item.prompt);
                      setTimeout(() => {
                        const imagesToQuery = activeImage ? [activeImage] : images;
                        void onRunQuery(item.prompt, imagesToQuery);
                      }, 50);
                    }}
                    className="px-2.5 py-1 rounded-full border border-[var(--color-line)] bg-white/5 hover:bg-white/10 text-[11px] text-white/85 hover:text-white transition flex items-center gap-1.5 group cursor-pointer"
                  >
                    <ChevronRight className="w-3 h-3 text-[var(--color-brand-soft)] group-hover:translate-x-0.5 transition-transform" />
                    <span>{item.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Dispatch Button */}
            <button
              type="submit"
              disabled={isQuerying || !query.trim()}
              className={`w-full py-3.5 rounded-xl text-[14px] font-semibold tracking-wide transition flex items-center justify-center gap-2.5 ${
                isQuerying
                  ? "bg-white/10 text-[var(--color-mute)] cursor-wait"
                  : query.trim()
                  ? "bg-[var(--color-brand)] hover:bg-[#4b8ef5] text-white shadow-[0_0_25px_rgba(47,123,240,0.35)] cursor-pointer active:scale-[0.99]"
                  : "bg-white/5 text-[var(--color-mute)] cursor-not-allowed"
              }`}
            >
              <Send className={`w-4 h-4 ${isQuerying ? "animate-spin" : ""}`} />
              {isQuerying ? "Analyzing Multimodal Satellite Pixels..." : "Ask Agent About This Image"}
            </button>
          </form>

          {/* Integrated Agent Answer Card (Live preview in this section!) */}
          {trace && (
            <div className="mt-2 rounded-xl border border-[var(--color-brand)]/50 bg-black/70 p-4 space-y-3 shadow-[0_0_30px_rgba(47,123,240,0.12)] animate-slide-up">
              <div className="flex items-center justify-between border-b border-[var(--color-line)] pb-2.5">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[var(--color-brand-soft)] animate-pulse" />
                  <span className="mono text-[11px] font-semibold text-[var(--color-brand-soft)] uppercase tracking-wider">
                    Agent Answer
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={copyAnswer}
                    className="p-1 rounded hover:bg-white/10 text-[var(--color-mute)] hover:text-white transition flex items-center gap-1 mono text-[10px]"
                    title="Copy Answer"
                  >
                    {copiedAnswer ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>

                  {trace.run_id && (
                    <a
                      href={api.reportUrl(trace.run_id)}
                      download={`satquery-${trace.run_id}.md`}
                      className="p-1 rounded hover:bg-white/10 text-[var(--color-brand-soft)] hover:underline transition flex items-center gap-1 mono text-[10px]"
                      title="Download Full Markdown Audit"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Report</span>
                    </a>
                  )}
                </div>
              </div>

              {/* Synthesized Answer Body */}
              <p className="text-[14px] leading-[1.65] text-white/95">{trace.answer}</p>

              {/* Quick Spectral Metrics Bar if available */}
              {trace.analysis?.available && trace.analysis.scene?.cover && (
                <div className="pt-2 border-t border-[var(--color-line)] space-y-1.5">
                  <span className="mono text-[10px] text-[var(--color-mute)] uppercase tracking-wider block">
                    Calculated Land-Cover Fractions:
                  </span>
                  <div className="grid grid-cols-4 gap-1.5 mono text-[10.5px]">
                    <div className="p-1.5 rounded bg-white/5 border border-[var(--color-line)] text-center">
                      <div className="text-[var(--color-verd)] font-semibold">
                        {trace.analysis.scene.cover.vegetation?.pct.toFixed(1)}%
                      </div>
                      <div className="text-[9px] text-[var(--color-mute)]">Vegetation</div>
                    </div>
                    <div className="p-1.5 rounded bg-white/5 border border-[var(--color-line)] text-center">
                      <div className="text-[var(--color-signal)] font-semibold">
                        {trace.analysis.scene.cover["built-up"]?.pct.toFixed(1)}%
                      </div>
                      <div className="text-[9px] text-[var(--color-mute)]">Built-Up</div>
                    </div>
                    <div className="p-1.5 rounded bg-white/5 border border-[var(--color-line)] text-center">
                      <div className="text-[var(--color-ice)] font-semibold">
                        {trace.analysis.scene.cover.water?.pct.toFixed(1)}%
                      </div>
                      <div className="text-[9px] text-[var(--color-mute)]">Water</div>
                    </div>
                    <div className="p-1.5 rounded bg-white/5 border border-[var(--color-line)] text-center">
                      <div className="text-white/70 font-semibold">
                        {trace.analysis.scene.cover["bare/other"]?.pct.toFixed(1)}%
                      </div>
                      <div className="text-[9px] text-[var(--color-mute)]">Bare / Other</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Model Specialist Attribution */}
              <div className="flex items-center justify-between pt-1 mono text-[10px] text-[var(--color-mute)]">
                <span>MODELS: {trace.models_invoked.join(", ") || "M1–M7 ENSEMBLE"}</span>
                <span>{trace.total_ms} ms</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
