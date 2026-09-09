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
              className="p-1.5 rounded-xl text-white/50 hover:text-white hover:bg-white/10 transition-colors"
              title="Close Dual View"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Central Synchronized Telemetry Banner */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-2 border-b border-white/[0.08] bg-white/[0.02] text-[11px] font-mono text-white/70">
          <div className="flex items-center gap-2">
            <span className="text-cyan-400">COORDS:</span>
            <span>{coords[1].toFixed(4)}° N, {coords[0].toFixed(4)}° E</span>
            <span className="text-white/20">|</span>
            <span className="text-emerald-400">CAMERA ID:</span>
            <span>{cctvFeed.cameraId}</span>
            <span className="text-white/20">|</span>
            <span className="text-amber-300">SENSOR SUITE:</span>
            <span>Sentinel-2 MSI + 1080p Optical CCTV</span>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-white/50">
              <Clock className="w-3.5 h-3.5 text-cyan-400" />
              <span className="tabular-nums text-white/80">{currentTime}</span>
            </div>
          </div>
        </div>

        {/* Main Side-by-Side Dual Display Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5">
          {/* ================= LEFT PANE: ORBITAL SATELLITE VIEW ================= */}
          <div className="flex flex-col rounded-2xl bg-black/60 border border-white/15 overflow-hidden shadow-xl relative group">
            {/* Top Bar for Satellite */}
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/10 bg-white/[0.03]">
              <div className="flex items-center gap-2">
                <Satellite className="w-4 h-4 text-cyan-400" />
                <span className="text-[12px] font-semibold text-white tracking-wide">
                  ORBITAL VIEW (OVERHEAD)
                </span>
                <span className="px-1.5 py-0.2 rounded text-[9.5px] font-mono uppercase bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  10m GSD
                </span>
              </div>

              {/* Band Mode Switcher */}
              <div className="flex items-center bg-black/60 rounded-lg p-0.5 border border-white/10 text-[10px] font-mono">
                {(["rgb", "cir", "ndvi"] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => setBandMode(m)}
                    className={`px-2 py-0.5 rounded uppercase transition-colors ${
                      bandMode === m ? "bg-cyan-500 text-black font-bold" : "text-white/60 hover:text-white"
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>

            {/* Satellite Image Canvas */}
            <div className="relative flex-1 min-h-[300px] sm:min-h-[380px] bg-black flex items-center justify-center overflow-hidden">
              {satelliteImage ? (
                <img
                  src={getPreviewUrl(satelliteImage, bandMode)}
                  alt="Orbital Satellite Observation"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="flex flex-col items-center gap-2 text-white/40">
                  <Satellite className="w-8 h-8 text-cyan-400 animate-pulse" />
                  <span className="text-[12px] font-mono">Acquiring Orbital Sentinel Imagery...</span>
                </div>
              )}

              {/* Overlaid Tactical Crosshair & Target Reticle */}
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <div className="w-24 h-24 rounded-full border border-cyan-400/40 animate-ping opacity-25" />
                <div className="w-16 h-16 rounded-full border border-cyan-400/60 flex items-center justify-center">
                  <div className="w-2 h-2 rounded-full bg-cyan-400" />
                </div>
                <div className="absolute w-28 h-px bg-cyan-400/40" />
                <div className="absolute h-28 w-px bg-cyan-400/40" />
              </div>

              {/* Bottom Telemetry Overlay */}
              <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-[10.5px] font-mono text-white/80 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/15 pointer-events-none">
                <span>SENSOR: Sentinel-2 MSI</span>
                <span>ALTITUDE: ~786 KM LEO</span>
                <span>SUN ELEVATION: 58.4°</span>
              </div>
            </div>
          </div>

          {/* ================= RIGHT PANE: LIVE STREET CCTV VIDEO FOOTAGE ================= */}
          <div className="flex flex-col rounded-2xl bg-black/60 border border-white/15 overflow-hidden shadow-xl relative group">
            {/* Top Bar for Ground Camera */}
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/10 bg-white/[0.03]">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
                </span>
                <span className="text-[12px] font-semibold text-white tracking-wide">
                  GROUND STREET CCTV (LIVE)
                </span>
                <span className="px-1.5 py-0.2 rounded text-[9.5px] font-mono bg-red-500/20 text-red-300 border border-red-500/30">
                  {cctvFeed.fps} FPS
                </span>
              </div>

              {/* AI Detection Toggle */}
              <button
                onClick={() => setShowAiDetections(!showAiDetections)}
                className={`px-2 py-0.5 rounded-lg border text-[10.5px] font-mono transition-colors flex items-center gap-1 ${
                  showAiDetections
                    ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-300"
                    : "bg-black/50 border-white/10 text-white/50 hover:text-white"
                }`}
              >
                <Eye className="w-3 h-3" />
                <span>AI Boxes</span>
              </button>
            </div>

            {/* Video Footage Player Container */}
            <div className="relative flex-1 min-h-[300px] sm:min-h-[380px] bg-black flex items-center justify-center overflow-hidden">
              <video
                ref={videoRef}
                src={selectedAngle.videoUrl}
                poster={selectedAngle.posterUrl}
                autoPlay
                loop
                muted={isMuted}
                playsInline
                className="w-full h-full object-cover"
              />

              {/* Live Video OSD (On-Screen Display Overlays) */}
              <div className="absolute top-3 left-3 z-10 font-mono text-[11px] text-emerald-400 drop-shadow-md pointer-events-none space-y-0.5">
                <div className="flex items-center gap-2 font-bold tracking-wider">
                  <span className="px-1.5 py-0.5 bg-red-600 text-white text-[9.5px] rounded">REC</span>
                  <span>{selectedAngle.name}</span>
                </div>
                <div className="text-[10px] text-white/80">{currentTime}</div>
              </div>

              {/* AI Object Detection Bounding Boxes Overlay */}
              {showAiDetections && (
                <div className="absolute inset-0 pointer-events-none z-10">
                  {/* Bounding Box 1: Bus */}
                  <div className="absolute top-[35%] left-[22%] w-[26%] h-[28%] border-2 border-amber-400/80 rounded bg-amber-400/10">
                    <span className="absolute -top-4 left-0 px-1 rounded bg-amber-400 text-black font-mono text-[9px] font-bold">
                      BUS 96%
                    </span>
                  </div>

                  {/* Bounding Box 2: Car */}
                  <div className="absolute top-[55%] left-[58%] w-[18%] h-[20%] border-2 border-emerald-400/80 rounded bg-emerald-400/10">
                    <span className="absolute -top-4 left-0 px-1 rounded bg-emerald-400 text-black font-mono text-[9px] font-bold">
                      CAR 92%
                    </span>
                  </div>

                  {/* Bounding Box 3: Auto Rickshaw */}
                  <div className="absolute top-[48%] left-[45%] w-[12%] h-[16%] border-2 border-cyan-400/80 rounded bg-cyan-400/10">
                    <span className="absolute -top-4 left-0 px-1 rounded bg-cyan-400 text-black font-mono text-[9px] font-bold">
                      AUTO 94%
                    </span>
                  </div>

                  {/* Bounding Box 4: Pedestrian */}
                  <div className="absolute top-[62%] left-[12%] w-[8%] h-[18%] border-2 border-purple-400/80 rounded bg-purple-400/10">
                    <span className="absolute -top-4 left-0 px-1 rounded bg-purple-400 text-white font-mono text-[9px] font-bold">
                      PED 88%
                    </span>
                  </div>
                </div>
              )}

              {/* Player Floating Control Bar */}
              <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-[11px] font-mono text-white/90 bg-black/70 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/15 z-20">
                <div className="flex items-center gap-3">
                  <button
                    onClick={togglePlay}
                    className="hover:text-cyan-400 transition-colors"
                    title={isPlaying ? "Pause" : "Play"}
                  >
                    {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={() => setIsMuted(!isMuted)}
                    className="hover:text-cyan-400 transition-colors"
                    title={isMuted ? "Unmute" : "Mute"}
                  >
                    {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                  </button>
                  <span className="text-white/40">|</span>
                  <span className="text-[10px] text-white/70">{cctvFeed.resolution}</span>
                </div>

                {/* Detected Live Counts */}
                <div className="flex items-center gap-3 text-[10.5px]">
                  <div className="flex items-center gap-1 text-amber-300">
                    <Bus className="w-3 h-3" />
                    <span>{selectedAngle.detectionCount.buses}</span>
                  </div>
                  <div className="flex items-center gap-1 text-emerald-300">
                    <Car className="w-3 h-3" />
                    <span>{selectedAngle.detectionCount.vehicles}</span>
                  </div>
                  <div className="flex items-center gap-1 text-purple-300">
                    <Users className="w-3 h-3" />
                    <span>{selectedAngle.detectionCount.pedestrians}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Camera Angle Switcher Bar */}
            <div className="px-3 py-2 border-t border-white/10 bg-black/40 flex items-center gap-1.5 overflow-x-auto scrollbar-none">
              <span className="text-[10px] font-mono text-white/40 uppercase shrink-0 px-1">
                Angles:
              </span>
              {cctvFeed.angles.map((angle) => {
                const isCurrent = angle.id === selectedAngle.id;
                return (
                  <button
                    key={angle.id}
                    onClick={() => setSelectedAngle(angle)}
                    className={`px-2.5 py-1 rounded-lg border text-[10.5px] font-mono transition-colors shrink-0 ${
                      isCurrent
                        ? "bg-cyan-500/20 border-cyan-400 text-cyan-300 font-bold"
                        : "bg-black/50 border-white/10 text-white/60 hover:text-white hover:bg-white/5"
                    }`}
                  >
                    {angle.name.split(":")[0]}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer Summary */}
        <div className="px-5 py-3 border-t border-white/10 bg-black/40 flex items-center justify-between text-[11.5px] text-white/60">
          <p className="line-clamp-1">
            <strong className="text-white">{selectedAngle.name}:</strong> {selectedAngle.description}
          </p>
          <span className="mono text-[10px] text-cyan-400 shrink-0 hidden sm:inline">
            SYNCHRONIZED (ORBIT → GROUND LOCKED)
          </span>
        </div>
      </div>
    </div>
  );
}
