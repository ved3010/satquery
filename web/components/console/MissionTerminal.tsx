"use client";

import { useState } from "react";
import {
  api,
  EXAMPLE_QUERIES,
  type ImageRef,
  type Scene,
  type Trace,
} from "@/lib/api";
import {
  Terminal,
  Cpu,
  Download,
  AlertTriangle,
  CheckCircle2,
  Scan,
  Send,
  Radio,
  ChevronDown,
  ChevronUp,
  Sparkles,
} from "lucide-react";

const CLASS_ORDER = ["water", "vegetation", "sparse vegetation", "built-up", "bare/other"];
const TONE: Record<string, string> = {
  water: "#00f3ff",
  vegetation: "#10b981",
  "sparse vegetation": "#8fd6a8",
  "built-up": "#f59e0b",
  "bare/other": "rgba(255,255,255,0.42)",
};

const n2 = (x: number) => (x >= 0 ? "+" : "") + x.toFixed(2);

interface MissionTerminalProps {
  bbox: number[] | null;
  start: string;
  setStart: (s: string) => void;
  end: string;
  setEnd: (s: string) => void;
  bitemporal: boolean;
  setBitemporal: (b: boolean) => void;
  start2: string;
  setStart2: (s: string) => void;
  end2: string;
  setEnd2: (s: string) => void;
  cloud: number;
  setCloud: (c: number) => void;
  wantSar: boolean;
  setWantSar: (w: boolean) => void;
  images: ImageRef[];
  scenes: Scene[];
  warnings: string[];
  query: string;
  setQuery: (q: string) => void;
  busy: null | "fetch" | "upload" | "query";
  error: string | null;
  trace: Trace | null;
  onFetchAoi: () => void;
  onRunQuery: () => void;
  onReset: () => void;
}

export function MissionTerminal({
  bbox,
  start,
  setStart,
  end,
  setEnd,
  bitemporal,
  setBitemporal,
  start2,
  setStart2,
  end2,
  setEnd2,
  cloud,
  setCloud,
  wantSar,
  setWantSar,
  images,
  warnings,
  query,
  setQuery,
  busy,
  error,
  trace,
  onFetchAoi,
  onRunQuery,
  onReset,
}: MissionTerminalProps) {
  const [activeTab, setActiveTab] = useState<"control" | "trace" | "spectral">("control");
  const [isMinimized, setIsMinimized] = useState(false);

  return (
    <div
      className={`tactical-glass rounded-xl overflow-hidden shadow-2xl transition-all duration-300 flex flex-col ${
        isMinimized ? "h-[54px]" : "h-full max-h-[750px]"
      }`}
    >
      {/* Terminal Title Bar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--color-line)] bg-black/60">
        <div className="flex items-center gap-2.5">
          <Terminal className="w-4 h-4 text-[var(--color-ice)]" />
          <span className="tactical text-xs font-bold text-white tracking-widest uppercase">
            Mission Command & Agent Terminal
          </span>
          {busy && (
            <span className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-[var(--color-signal)]/20 border border-[var(--color-signal)]/40 text-[var(--color-signal)] text-[10px] tactical animate-pulse">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-signal)] animate-ping" />
              RUNNING ({busy.toUpperCase()})
            </span>
          )}
        </div>

        {/* Tab Switcher & Minimize Controls */}
        <div className="flex items-center gap-2">
          {!isMinimized && (
            <div className="flex bg-white/5 rounded p-0.5 border border-white/10 tactical text-[10px]">
              <button
                onClick={() => setActiveTab("control")}
                className={`px-2.5 py-1 rounded transition ${
                  activeTab === "control" ? "bg-[var(--color-ice)]/20 text-[var(--color-ice)] font-bold" : "text-[var(--color-mute)] hover:text-white"
                }`}
              >
                TARGET & QUERY
              </button>
              <button
                onClick={() => setActiveTab("trace")}
                className={`px-2.5 py-1 rounded transition flex items-center gap-1 ${
                  activeTab === "trace" ? "bg-[var(--color-ice)]/20 text-[var(--color-ice)] font-bold" : "text-[var(--color-mute)] hover:text-white"
                }`}
              >
                <span>AGENT TRACE</span>
                {trace && <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-verd)]" />}
              </button>
              <button
                onClick={() => setActiveTab("spectral")}
                className={`px-2.5 py-1 rounded transition ${
                  activeTab === "spectral" ? "bg-[var(--color-ice)]/20 text-[var(--color-ice)] font-bold" : "text-[var(--color-mute)] hover:text-white"
                }`}
              >
                SPECTRAL CALCULUS
              </button>
            </div>
          )}

          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="p-1 text-[var(--color-mute)] hover:text-white hover:bg-white/10 rounded transition"
            title={isMinimized ? "Expand Terminal" : "Collapse Terminal"}
          >
            {isMinimized ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {!isMinimized && (
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Error Banner */}
          {error && (
            <div className="p-3 rounded-lg bg-red-950/50 border border-red-500/40 text-red-200 text-xs tactical flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <div>
                <div className="font-bold text-red-400">OPERATION REFUSED / ERROR</div>
                <div className="text-[11px] mt-0.5">{error}</div>
              </div>
            </div>
          )}

          {/* TAB 1: TARGETING & QUERY EXECUTION */}
          {activeTab === "control" && (
            <div className="space-y-4">
              {/* Step 1: Satellite Acquisition Parameters */}
              <div className="p-3.5 rounded-lg bg-black/40 border border-[var(--color-line)] space-y-3">
                <div className="flex items-center justify-between">
                  <span className="tactical text-[11px] font-bold text-[var(--color-ice)] flex items-center gap-1.5 uppercase">
                    <Scan className="w-3.5 h-3.5" /> 01. Area of Interest & Acquisition Window
                  </span>
                  <span className="text-[10px] tactical text-[var(--color-mute)]">
                    {bbox ? `AOI: [${bbox.join(", ")}]` : "NO AOI LOCKED"}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] tactical text-[var(--color-mute)] block mb-1">
                      Primary Target Date Window (T1)
                    </label>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="date"
                        value={start}
                        onChange={(e) => setStart(e.target.value)}
                        className="bg-black/60 border border-[var(--color-line)] rounded px-2.5 py-1.5 text-xs tactical text-white focus:border-[var(--color-ice)] outline-none w-full"
                      />
                      <span className="text-[var(--color-mute)] text-xs">→</span>
                      <input
                        type="date"
                        value={end}
                        onChange={(e) => setEnd(e.target.value)}
                        className="bg-black/60 border border-[var(--color-line)] rounded px-2.5 py-1.5 text-xs tactical text-white focus:border-[var(--color-ice)] outline-none w-full"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex-1">
                      <label className="text-[10px] tactical text-[var(--color-mute)] block mb-1">
                        Max Cloud Threshold ({cloud}%)
                      </label>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={cloud}
                        onChange={(e) => setCloud(Number(e.target.value))}
                        className="w-full accent-[var(--color-ice)]"
                      />
                    </div>

                    <div className="flex flex-col justify-end">
                      <label className="text-[10px] tactical text-[var(--color-mute)] block mb-1">
                        SAR Radar
                      </label>
