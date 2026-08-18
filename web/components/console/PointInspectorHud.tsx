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
