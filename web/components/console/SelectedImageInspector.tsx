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
