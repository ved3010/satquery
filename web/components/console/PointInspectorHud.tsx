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
  if (!point) return null;

  const style = CATEGORY_STYLES[point.category] || CATEGORY_STYLES.built_up;

  return (
    <div className="absolute top-16 right-4 z-40 w-full max-w-[360px] panel rounded-xl p-4.5 border border-white/20 bg-black/90 backdrop-blur-xl shadow-2xl space-y-3.5 animate-slide-up">
      {/* Header */}
      <div className="flex items-start justify-between gap-2 border-b border-[var(--color-line)] pb-2.5">
        <div className="space-y-1">
          <div className="flex items-center gap-1.5">
            <span
              className={`mono text-[9.5px] font-bold tracking-wider px-2 py-0.5 rounded border ${style.border} ${style.bg} ${style.text}`}
            >
              {style.label}
            </span>
          </div>
          <h4 className="text-[14px] font-semibold text-white">{point.name}</h4>
          <div className="mono text-[10.5px] text-[var(--color-mute)]">
            {point.coords[1]}° N, {point.coords[0]}° E · {point.areaHectares} ha
          </div>
        </div>

        <button
          onClick={onClose}
          className="p-1 rounded text-[var(--color-mute)] hover:text-white transition"
          title="Close Point Inspector"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Description & Change Details */}
      <div className="text-[12.5px] leading-relaxed text-white/90">
        {point.description}
