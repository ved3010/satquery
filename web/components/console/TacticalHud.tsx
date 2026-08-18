"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Globe,
  Radio,
  Activity,
  ShieldAlert,
  ArrowLeft,
  Maximize,
  Clock,
  Compass,
  Zap,
} from "lucide-react";
import type { Health } from "@/lib/api";

interface TacticalHudProps {
  backendHealth: Health | null;
  backendError: string | null;
  activeLayer: string;
}

export function TacticalHud({ backendHealth, backendError, activeLayer }: TacticalHudProps) {
  const [zuluTime, setZuluTime] = useState("");
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setZuluTime(
        now.toISOString().replace("T", " ").replace("Z", " UTC")
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.().catch(() => {});
      setIsFullscreen(false);
    }
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-40 h-14 bg-black/80 backdrop-blur-md border-b border-[var(--color-line)] px-4 flex items-center justify-between pointer-events-auto">
      {/* Brand & Mission Identifier */}
      <div className="flex items-center gap-4">
        <Link
          href="/"
          className="flex items-center gap-2 px-2.5 py-1 rounded bg-white/5 hover:bg-white/10 border border-white/10 text-xs tactical text-[var(--color-mute)] hover:text-white transition"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>HQ HOME</span>
        </Link>

        <div className="flex items-center gap-2.5">
          <div className="w-2.5 h-2.5 rounded-full bg-[var(--color-ice)] shadow-[0_0_10px_#00f3ff] animate-pulse" />
          <div className="tactical">
            <span className="font-bold text-white tracking-widest text-xs uppercase">
              SATQUERY // GOD'S EYE VIEW
            </span>
            <span className="text-[10px] text-[var(--color-ice)] ml-2 hidden sm:inline">
              [ ORBITAL RECON SIMULATOR ]
            </span>
          </div>
        </div>
      </div>

      {/* Center Telemetry Banner */}
