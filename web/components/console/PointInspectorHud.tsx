"use client";

import type { DetectedFeaturePoint } from "@/lib/spatialAnalysis";
import {
  MapPin,
  Sparkles,
  Layers,
  Activity,
  ArrowUpRight,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  X,
  Send,
  Zap,
} from "lucide-react";

const CATEGORY_STYLES: Record<
  DetectedFeaturePoint["category"],
  { border: string; bg: string; text: string; label: string }
> = {
  built_up: {
    border: "border-amber-500/50",
    bg: "bg-amber-950/40",
    text: "text-amber-400",
    label: "NEW BUILT-UP DEVELOPMENT",
  },
  vegetation_loss: {
    border: "border-red-500/50",
    bg: "bg-red-950/40",
    text: "text-red-400",
    label: "VEGETATION LOSS / CLEARING",
  },
  vegetation_gain: {
    border: "border-emerald-500/50",
    bg: "bg-emerald-950/40",
    text: "text-emerald-400",
    label: "DENSE BIOMASS CANOPY",
  },
  water: {
    border: "border-cyan-500/50",
    bg: "bg-cyan-950/40",
    text: "text-cyan-400",
    label: "WATER BODY / HYDROLOGY",
  },
  farmland: {
    border: "border-yellow-500/50",
    bg: "bg-yellow-950/40",
    text: "text-yellow-400",
    label: "AGRICULTURAL CROPLAND",
  },
  infrastructure: {
    border: "border-blue-500/50",
    bg: "bg-blue-950/40",
    text: "text-blue-400",
    label: "TRANSPORT INFRASTRUCTURE",
  },
};

interface PointInspectorHudProps {
  point: DetectedFeaturePoint | null;
  onClose: () => void;
  onAskAboutPoint?: (query: string) => void;
}

export function PointInspectorHud({ point, onClose, onAskAboutPoint }: PointInspectorHudProps) {
