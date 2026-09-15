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
  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      const timeStr = `${now.toISOString().slice(0, 10)} ${now.toLocaleTimeString("en-GB")}.${String(now.getMilliseconds()).padStart(3, "0")} IST`;
      setCurrentTime(timeStr);
    }, 50);
    return () => clearInterval(timer);
  }, []);

  // Update angle if cctvFeed changes
  useEffect(() => {
    setSelectedAngle(cctvFeed.angles[0]);
  }, [cctvFeed]);

  const togglePlay = () => {
    if (videoRef.current) {
      if (videoRef.current.paused) {
        void videoRef.current.play();
        setIsPlaying(true);
      } else {
        videoRef.current.pause();
        setIsPlaying(false);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-xl animate-fade-in">
      {/* Outer Tactical Cockpit Window */}
      <div className="relative w-full max-w-6xl max-h-[92vh] flex flex-col rounded-3xl bg-[#080b11]/95 border border-white/20 shadow-[0_24px_64px_rgba(0,0,0,0.8),inset_0_1px_1px_rgba(255,255,255,0.2)] overflow-hidden">
        {/* Top Specular Accent & Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/10 bg-black/60 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-500 via-blue-600 to-indigo-600 p-[1px] shadow-lg shadow-cyan-500/20 flex items-center justify-center">
              <div className="w-full h-full bg-black rounded-[11px] flex items-center justify-center">
                <Video className="w-4 h-4 text-cyan-300 animate-pulse" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-[14px] font-bold text-white tracking-tight">
                  Dual Orbit-to-Ground Surveillance
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono uppercase bg-red-500/20 text-red-300 border border-red-500/30 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-ping" />
                  LIVE GROUND FEED
                </span>
              </div>
              <p className="text-[11px] text-white/60">
                Synchronized Target: <strong className="text-white">{cctvFeed.locationName}</strong> · {cctvFeed.landmark}
              </p>
            </div>
          </div>

          {/* Close Button */}
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
