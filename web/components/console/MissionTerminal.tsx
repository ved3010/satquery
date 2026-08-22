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
                      <button
                        onClick={() => setWantSar(!wantSar)}
                        className={`px-3 py-1.5 rounded text-xs tactical border transition ${
                          wantSar
                            ? "bg-[var(--color-signal)]/20 border-[var(--color-signal)] text-[var(--color-signal)] font-bold"
                            : "bg-white/5 border-white/10 text-[var(--color-mute)]"
                        }`}
                      >
                        {wantSar ? "SAR ACTIVE" : "OPTICAL ONLY"}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Bi-temporal toggle */}
                <div className="pt-2 border-t border-white/5 flex flex-wrap items-center justify-between gap-2">
                  <label className="flex items-center gap-2 cursor-pointer text-xs tactical text-white">
                    <input
                      type="checkbox"
                      checked={bitemporal}
                      onChange={(e) => setBitemporal(e.target.checked)}
                      className="accent-[var(--color-ice)]"
                    />
                    <span>Bi-Temporal Change Analysis (T0 Comparison Baseline)</span>
                  </label>

                  {bitemporal && (
                    <div className="flex items-center gap-1.5 text-xs tactical">
                      <input
                        type="date"
                        value={start2}
                        onChange={(e) => setStart2(e.target.value)}
                        className="bg-black/60 border border-[var(--color-line)] rounded px-2 py-1 text-[11px] text-white"
                      />
                      <span className="text-[var(--color-mute)]">→</span>
                      <input
                        type="date"
                        value={end2}
                        onChange={(e) => setEnd2(e.target.value)}
                        className="bg-black/60 border border-[var(--color-line)] rounded px-2 py-1 text-[11px] text-white"
                      />
                    </div>
                  )}
                </div>

                {/* Scan Action */}
                <button
                  onClick={onFetchAoi}
                  disabled={busy !== null || !bbox}
                  className={`w-full py-2.5 rounded-lg tactical text-xs font-bold tracking-wider flex items-center justify-center gap-2 border transition ${
                    busy === "fetch"
                      ? "bg-[var(--color-signal)]/20 border-[var(--color-signal)] text-[var(--color-signal)] cursor-wait"
                      : bbox
                      ? "bg-[var(--color-ice)]/20 border-[var(--color-ice)] text-[var(--color-ice)] hover:bg-[var(--color-ice)]/30 hover:shadow-[0_0_15px_rgba(0,243,255,0.3)] cursor-pointer"
                      : "bg-white/5 border-white/10 text-[var(--color-mute)] cursor-not-allowed"
                  }`}
                >
                  <Radio className={`w-4 h-4 ${busy === "fetch" ? "animate-spin" : ""}`} />
                  {busy === "fetch"
                    ? "COMMUNICATING WITH COPERNICUS STAC..."
                    : "EXECUTE LIVE SATELLITE ACQUISITION (AOI SCAN)"}
                </button>
              </div>

              {/* Acquired Imagery Cards */}
              {images.length > 0 && (
                <div className="p-3.5 rounded-lg bg-black/40 border border-[var(--color-line)] space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="tactical text-[11px] font-bold text-[var(--color-verd)] flex items-center gap-1.5 uppercase">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Acquired Satellite Imagery ({images.length} Scenes)
                    </span>
                    <span className="text-[10px] tactical text-[var(--color-mute)]">CO-REGISTERED</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {images.map((img) => (
                      <div
                        key={img.path}
                        className="tactical-glass-subtle p-2.5 rounded border border-white/10 flex items-center gap-3"
                      >
                        {img.preview ? (
                          <img
                            src={img.preview}
                            alt="Satellite Preview"
                            className="w-14 h-14 object-cover rounded border border-white/20 shrink-0"
                          />
                        ) : (
                          <div className="w-14 h-14 bg-blue-950/40 rounded border border-blue-500/20 flex items-center justify-center shrink-0">
                            <Radio className="w-6 h-6 text-blue-400" />
                          </div>
                        )}
                        <div className="min-w-0 flex-1 tactical text-[10.5px]">
                          <div className="font-bold text-white uppercase truncate">
                            {img.modality ?? "OPTICAL"} SATELLITE
                          </div>
                          <div className="text-[var(--color-mute)] text-[9.5px] truncate">
                            DATE: {img.date ?? "RECENT PASS"}
                          </div>
                          <div className="text-[var(--color-ice)] text-[9px] truncate">{img.path}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Step 2: Natural Language Reconnaissance Query */}
              <div className="p-3.5 rounded-lg bg-black/40 border border-[var(--color-line)] space-y-3">
                <div className="flex items-center justify-between">
                  <span className="tactical text-[11px] font-bold text-[var(--color-ice)] flex items-center gap-1.5 uppercase">
                    <Cpu className="w-3.5 h-3.5" /> 02. Agentic Vision-Language Query
                  </span>
                  <span className="text-[10px] tactical text-[var(--color-mute)]">M1–M7 SPECIALISTS</span>
                </div>

                <div className="relative">
                  <textarea
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    rows={2}
                    placeholder="Ask a question about the acquired satellite imagery..."
                    className="w-full bg-black/70 border border-[var(--color-line)] rounded-lg p-3 text-xs tactical text-white focus:border-[var(--color-ice)] outline-none resize-none"
                  />
                </div>

                {/* Preset Prompt Buttons */}
                <div className="flex flex-wrap gap-1.5">
                  {EXAMPLE_QUERIES.map((eq) => (
                    <button
                      key={eq.label}
                      onClick={() => setQuery(eq.text)}
                      className="px-2.5 py-1 rounded bg-white/5 hover:bg-white/10 border border-white/10 text-[10px] tactical text-[var(--color-mute)] hover:text-white transition"
                    >
                      {eq.label}
                    </button>
                  ))}
                </div>

                {/* Run Agent Button */}
                <button
                  onClick={onRunQuery}
                  disabled={busy !== null || !query.trim()}
                  className={`w-full py-2.5 rounded-lg tactical text-xs font-bold tracking-wider flex items-center justify-center gap-2 border transition ${
                    busy === "query"
                      ? "bg-[var(--color-signal)]/20 border-[var(--color-signal)] text-[var(--color-signal)] cursor-wait"
                      : query.trim()
                      ? "bg-[var(--color-verd)]/20 border-[var(--color-verd)] text-[var(--color-verd)] hover:bg-[var(--color-verd)]/30 hover:shadow-[0_0_15px_rgba(16,185,129,0.3)] cursor-pointer"
                      : "bg-white/5 border-white/10 text-[var(--color-mute)] cursor-not-allowed"
                  }`}
                >
                  <Send className={`w-4 h-4 ${busy === "query" ? "animate-spin" : ""}`} />
                  {busy === "query"
                    ? "EXECUTING LANGGRAPH REASONING & TORCH HEADS..."
                    : "DISPATCH MULTIMODAL AGENT (RUN INFERENCE)"}
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: AUDITABLE AGENT EXECUTION TRACE */}
          {activeTab === "trace" && (
            <div className="space-y-4">
              {trace ? (
                <div className="space-y-3">
                  {/* Trace Header / Status Card */}
                  <div className="tactical-glass-subtle p-3.5 rounded-lg border border-[var(--color-line)] flex items-center justify-between">
                    <div>
                      <div className="tactical text-[11px] text-[var(--color-mute)]">RUN IDENTIFIER</div>
                      <div className="tactical text-sm font-bold text-[var(--color-ice)]">{trace.run_id}</div>
                    </div>

                    <div className="flex items-center gap-4 tactical text-xs">
                      <div>
                        <span className="text-[var(--color-mute)] text-[10px] block">TASK FAMILY</span>
                        <span className="text-white font-bold uppercase">{trace.task ?? "VALIDATION"}</span>
                      </div>
                      <div>
                        <span className="text-[var(--color-mute)] text-[10px] block">LATENCY</span>
                        <span className="text-[var(--color-verd)]">{trace.total_ms} ms</span>
                      </div>
                      <div>
                        <span className="text-[var(--color-mute)] text-[10px] block">CONFIDENCE</span>
                        <span className="text-white">
                          {trace.confidence ? `${(trace.confidence * 100).toFixed(1)}%` : "N/A"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Primary Agent Answer Box */}
                  <div className="p-4 rounded-lg bg-black/60 border border-[var(--color-verd)]/40 shadow-[0_0_15px_rgba(16,185,129,0.1)]">
                    <div className="tactical text-[10px] tracking-widest text-[var(--color-verd)] uppercase flex items-center gap-1.5 mb-2">
                      <Sparkles className="w-3.5 h-3.5" /> Synthesized Agent Answer (Auditable)
                    </div>
                    <div className="text-xs text-white leading-relaxed font-sans">{trace.answer}</div>
                  </div>

                  {/* 7-Stage State Transitions / Checkpoints */}
                  <div className="space-y-1.5">
                    <div className="tactical text-[10.5px] text-[var(--color-mute)] tracking-wider uppercase">
                      Execution Checkpoints ({trace.steps.length} Nodes)
                    </div>
                    <div className="space-y-1 max-h-[280px] overflow-y-auto pr-1">
                      {trace.steps.map((s, idx) => (
                        <div
                          key={idx}
                          className="p-2.5 rounded bg-black/40 border border-white/5 tactical text-[11px] flex items-center justify-between"
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-[var(--color-ice)] font-bold">{s.node}</span>
                            <span className="text-white">{s.outcome}</span>
                          </div>
                          <span className="text-[var(--color-mute)] text-[10px]">{s.latency_ms} ms</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Download Report Button */}
                  {trace.run_id && (
                    <a
                      href={api.reportUrl(trace.run_id)}
                      download={`satquery-${trace.run_id}.md`}
                      className="w-full py-2 rounded bg-white/5 hover:bg-white/10 border border-white/15 text-xs tactical text-white flex items-center justify-center gap-2 transition"
                    >
                      <Download className="w-3.5 h-3.5 text-[var(--color-ice)]" />
                      DOWNLOAD AUDITABLE REPORT NOTE (.MD)
                    </a>
                  )}
                </div>
              ) : (
                <div className="p-8 text-center tactical text-xs text-[var(--color-mute)]">
                  No execution trace available yet. Lock an AOI and run an agent query to inspect real-time model dispatch and checkpoints.
                </div>
              )}
            </div>
          )}

          {/* TAB 3: SPECTRAL CALCULUS (LAND COVER PERCENTAGES) */}
          {activeTab === "spectral" && (
            <div className="space-y-4">
              {trace?.analysis?.available ? (
                <div className="space-y-3">
                  <div className="tactical text-[11px] text-[var(--color-ice)] font-bold uppercase">
                    Pixel-Derived Land Cover (NDVI / MNDWI / NDBI)
                  </div>

                  {/* Key Indicator Cards */}
                  <div className="grid grid-cols-3 gap-2">
                    {trace.analysis.mode === "single" ? (
                      <>
                        <div className="p-2.5 rounded bg-black/50 border border-emerald-500/30">
                          <div className="text-[9px] tactical text-emerald-400">VEGETATION</div>
                          <div className="text-base font-bold text-white mt-1">
                            {trace.analysis.scene?.cover.vegetation.pct.toFixed(2)}%
                          </div>
                        </div>
                        <div className="p-2.5 rounded bg-black/50 border border-amber-500/30">
                          <div className="text-[9px] tactical text-amber-400">BUILT-UP</div>
                          <div className="text-base font-bold text-white mt-1">
                            {trace.analysis.scene?.cover["built-up"].pct.toFixed(2)}%
                          </div>
                        </div>
                        <div className="p-2.5 rounded bg-black/50 border border-cyan-500/30">
                          <div className="text-[9px] tactical text-cyan-400">WATER</div>
                          <div className="text-base font-bold text-white mt-1">
                            {trace.analysis.scene?.cover.water.pct.toFixed(2)}%
                          </div>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="p-2.5 rounded bg-black/50 border border-emerald-500/30">
                          <div className="text-[9px] tactical text-emerald-400">Δ VEGETATION</div>
                          <div className="text-base font-bold text-white mt-1">
                            {n2(trace.analysis.change?.classes.vegetation.delta_pp ?? 0)} pp
                          </div>
                        </div>
                        <div className="p-2.5 rounded bg-black/50 border border-amber-500/30">
                          <div className="text-[9px] tactical text-amber-400">Δ URBANISATION</div>
                          <div className="text-base font-bold text-white mt-1">
                            {n2(trace.analysis.change?.classes["built-up"].delta_pp ?? 0)} pp
                          </div>
                        </div>
                        <div className="p-2.5 rounded bg-black/50 border border-cyan-500/30">
                          <div className="text-[9px] tactical text-cyan-400">Δ WATER</div>
                          <div className="text-base font-bold text-white mt-1">
                            {n2(trace.analysis.change?.classes.water.delta_pp ?? 0)} pp
                          </div>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Spectral Percentage Table */}
                  <div className="overflow-x-auto rounded border border-[var(--color-line)]">
                    <table className="w-full text-left tactical text-[10.5px]">
                      <thead>
                        <tr className="border-b border-[var(--color-line)] bg-white/5">
                          <th className="p-2 text-[var(--color-mute)]">CLASS</th>
                          {trace.analysis.mode === "single" ? (
                            <>
                              <th className="p-2 text-right text-[var(--color-mute)]">COVER %</th>
                              <th className="p-2 text-right text-[var(--color-mute)]">KM²</th>
                            </>
                          ) : (
                            <>
                              <th className="p-2 text-right text-[var(--color-mute)]">T1 %</th>
                              <th className="p-2 text-right text-[var(--color-mute)]">T2 %</th>
                              <th className="p-2 text-right text-[var(--color-mute)]">Δ PP</th>
                              <th className="p-2 text-right text-[var(--color-mute)]">Δ REL</th>
                            </>
                          )}
                        </tr>
                      </thead>
                      <tbody>
                        {CLASS_ORDER.map((c) => {
                          const single = trace.analysis?.mode === "single";
                          const cov = single ? trace.analysis?.scene?.cover[c] : null;
                          const ch = single ? null : trace.analysis?.change?.classes[c];
                          return (
                            <tr key={c} className="border-b border-white/5">
                              <td className="p-2 font-semibold" style={{ color: TONE[c] }}>
                                {c.toUpperCase()}
                              </td>
                              {single ? (
                                <>
                                  <td className="p-2 text-right text-white tabular-nums">
                                    {cov?.pct.toFixed(2)}%
                                  </td>
                                  <td className="p-2 text-right text-[var(--color-mute)] tabular-nums">
                                    {cov?.km2.toFixed(3)}
                                  </td>
                                </>
                              ) : (
                                <>
                                  <td className="p-2 text-right text-[var(--color-mute)] tabular-nums">
                                    {ch?.t1_pct.toFixed(2)}%
                                  </td>
                                  <td className="p-2 text-right text-white tabular-nums">
                                    {ch?.t2_pct.toFixed(2)}%
                                  </td>
                                  <td className="p-2 text-right text-white font-bold tabular-nums">
                                    {n2(ch?.delta_pp ?? 0)}
                                  </td>
                                  <td className="p-2 text-right text-[var(--color-mute)] tabular-nums">
                                    {ch?.relative_pct ? `${n2(ch.relative_pct)}%` : "N/A"}
                                  </td>
                                </>
                              )}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center tactical text-xs text-[var(--color-mute)]">
                  Spectral land-cover indices are computed directly from Sentinel-2 surface reflectance bands (NIR, Red, Green, SWIR) upon running an AOI query.
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
