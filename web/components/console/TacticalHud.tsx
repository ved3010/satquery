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
      <div className="hidden md:flex items-center gap-6 tactical text-xs">
        <div className="flex items-center gap-2 text-[var(--color-mute)]">
          <Clock className="w-3.5 h-3.5 text-[var(--color-ice)]" />
          <span className="tabular-nums text-white">{zuluTime || "SYNCING TIME..."}</span>
        </div>

        <div className="w-px h-4 bg-[var(--color-line)]" />

        <div className="flex items-center gap-2 text-[var(--color-mute)]">
          <Compass className="w-3.5 h-3.5 text-[var(--color-verd)]" />
          <span>SENSOR: <strong className="text-white uppercase">{activeLayer}</strong></span>
        </div>
      </div>

      {/* Right System Health & Fullscreen Controls */}
      <div className="flex items-center gap-3 tactical text-xs">
        {backendHealth ? (
          <div className="flex items-center gap-2 px-3 py-1 rounded bg-emerald-950/40 border border-emerald-500/30 text-emerald-300">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
            </span>
            <span className="text-[11px] font-bold">API ONLINE</span>
            <span className="text-[9px] opacity-75 hidden sm:inline">
              ({backendHealth.models_registered} MODELS)
            </span>
          </div>
        ) : backendError ? (
          <div className="flex items-center gap-2 px-3 py-1 rounded bg-red-950/40 border border-red-500/30 text-red-300">
            <ShieldAlert className="w-3.5 h-3.5 text-red-400" />
            <span className="text-[11px] font-bold">API DISCONNECTED</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 px-3 py-1 rounded bg-white/5 border border-white/10 text-[var(--color-mute)]">
            <Radio className="w-3.5 h-3.5 animate-spin" />
            <span className="text-[11px]">CONNECTING...</span>
          </div>
        )}

        <button
          onClick={toggleFullscreen}
          className="p-1.5 rounded bg-white/5 hover:bg-white/10 border border-white/10 text-[var(--color-mute)] hover:text-white transition"
          title="Toggle Fullscreen Cockpit"
        >
          <Maximize className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
}
