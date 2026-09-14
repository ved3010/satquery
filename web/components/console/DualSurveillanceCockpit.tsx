"use client";

import { useEffect, useRef, useState } from "react";
import {
  X,
  Radio,
  Satellite,
  Video,
  Layers,
  Compass,
  Maximize2,
  Minimize2,
  Volume2,
  VolumeX,
  Play,
  Pause,
  Eye,
  Activity,
  ShieldAlert,
  Car,
  Bus,
  Users,
  Clock,
  Sparkles,
  ChevronRight,
} from "lucide-react";
import { type ImageRef, getPreviewUrl } from "@/lib/api";
import { type GroundCctvFeed, type CctvCameraAngle } from "@/lib/puneCctvFeeds";

interface DualSurveillanceCockpitProps {
  cctvFeed: GroundCctvFeed;
  satelliteImage: ImageRef | null;
  locationName: string;
  coords: [number, number];
  onClose: () => void;
}

export function DualSurveillanceCockpit({
  cctvFeed,
  satelliteImage,
  locationName,
  coords,
  onClose,
}: DualSurveillanceCockpitProps) {
  const [selectedAngle, setSelectedAngle] = useState<CctvCameraAngle>(cctvFeed.angles[0]);
  const [bandMode, setBandMode] = useState<"rgb" | "cir" | "ndvi">("rgb");
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(true);
  const [showAiDetections, setShowAiDetections] = useState(true);
  const [currentTime, setCurrentTime] = useState<string>("");
  const videoRef = useRef<HTMLVideoElement>(null);

  // Live ticking clock with milliseconds
