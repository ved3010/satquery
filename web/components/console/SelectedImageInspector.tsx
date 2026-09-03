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
