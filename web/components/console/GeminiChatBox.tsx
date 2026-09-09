"use client";

import { useEffect, useRef, useState } from "react";
import {
  Sparkles,
  Send,
  Paperclip,
  X,
  Layers,
  Check,
  Copy,
  ChevronDown,
  ChevronUp,
  Radio,
  Satellite,
  Compass,
  Maximize2,
  Minimize2,
  Trash2,
  RefreshCw,
  Loader2,
  MapPin,
  Calendar,
  Eye,
  Info,
} from "lucide-react";
import { type ImageRef, type Trace, getPreviewUrl } from "@/lib/api";

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
  timestamp: string;
  attachedImages?: ImageRef[];
  locationName?: string;
  trace?: Trace;
  isError?: boolean;
};

interface GeminiChatBoxProps {
  currentImage: ImageRef | null;
  availableImages: ImageRef[];
  onSelectImage: (img: ImageRef) => void;
  onClearAttachedImage: () => void;
  onUploadImage: (file: File) => Promise<void>;
  onRunQuery: (query: string, imagesToUse: ImageRef[]) => Promise<void>;
  isQuerying: boolean;
  isFetchingImage: boolean;
  selectedLocationName?: string;
  messages: ChatMessage[];
  onClearMessages: () => void;
  queryInput: string;
  setQueryInput: (q: string) => void;
}

export function GeminiChatBox({
  currentImage,
  availableImages,
  onSelectImage,
  onClearAttachedImage,
  onUploadImage,
  onRunQuery,
  isQuerying,
  isFetchingImage,
  selectedLocationName,
  messages,
  onClearMessages,
  queryInput,
  setQueryInput,
}: GeminiChatBoxProps) {
  const [bandMode, setBandMode] = useState<"rgb" | "cir" | "swir" | "ndvi">("rgb");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expandedReasoning, setExpandedReasoning] = useState<Record<string, boolean>>({});
  const [enlargedImage, setEnlargedImage] = useState<string | null>(null);
  const [isMinimized, setIsMinimized] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatBottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll on new messages or when querying
  useEffect(() => {
    if (!isMinimized) {
      chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isQuerying, isMinimized]);

  // Handle Enter to submit (Shift+Enter for newline)
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleSubmit = () => {
    const trimmed = queryInput.trim();
    if (!trimmed || isQuerying) return;
    const imagesToPass = currentImage ? [currentImage] : availableImages.slice(0, 1);
    void onRunQuery(trimmed, imagesToPass);
  };

  const handleCopy = (id: string, text: string) => {
    void navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await onUploadImage(file);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const toggleReasoning = (id: string) => {
    setExpandedReasoning((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className={`relative flex flex-col bg-black/25 backdrop-blur-xl rounded-3xl border border-white/20 shadow-[0_12px_40px_rgba(0,0,0,0.4),inset_0_1px_1px_rgba(255,255,255,0.25)] overflow-hidden transition-all duration-300 ${
      isMinimized ? "h-auto" : "h-full"
    }`}>
      {/* Specular Edge Highlight & Ambient Glass Glow */}
      <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-white/40 to-transparent pointer-events-none z-30" />
      <div className="absolute -top-16 left-1/2 -translate-x-1/2 w-80 h-16 bg-cyan-500/15 blur-2xl pointer-events-none rounded-full" />

      {/* Sleek Glass Header */}
      <div className="relative z-20 flex items-center justify-between px-5 py-3 border-b border-white/10 bg-black/30 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-500 to-cyan-400 p-[1px] shadow-lg shadow-cyan-500/10 flex items-center justify-center">
            <div className="w-full h-full bg-black/80 backdrop-blur-xs rounded-[10px] flex items-center justify-center">
              <Sparkles className="w-3.5 h-3.5 text-cyan-300 animate-pulse" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-[13.5px] font-semibold text-white tracking-tight drop-shadow-sm">SatQuery AI</h2>
              <span className="px-1.5 py-0.5 rounded text-[9.5px] font-mono bg-white/10 text-cyan-300 border border-white/15 backdrop-blur-xs">
                GEMINI VISION
              </span>
            </div>
            <p className="text-[10.5px] text-white/60 drop-shadow-xs">
              {selectedLocationName ? `Target: ${selectedLocationName}` : "Search or tap Earth to analyze"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {messages.length > 0 && (
            <button
              onClick={onClearMessages}
              title="Clear conversation"
              className="p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-all text-[12px] flex items-center gap-1"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline text-[11px]">Clear</span>
            </button>
          )}

          {/* Minimize / Maximize Chatbox */}
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            title={isMinimized ? "Expand Chat" : "Minimize Chat to View Earth"}
            className="p-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-all"
          >
            {isMinimized ? <Maximize2 className="w-3.5 h-3.5" /> : <Minimize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Chat Messages Feed (Visible when not minimized) */}
      {!isMinimized && (
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 space-y-4 scrollbar-thin scrollbar-thumb-white/20 bg-transparent min-h-[220px]">
          {messages.length === 0 ? (
            /* Empty Minimal Welcome State - Fully See-Through to Earth */
            <div className="h-full flex flex-col justify-center items-center text-center px-4 py-8 space-y-2.5">
              <div className="w-11 h-11 rounded-2xl bg-white/[0.06] border border-white/20 backdrop-blur-md flex items-center justify-center shadow-lg">
                <Sparkles className="w-5 h-5 text-cyan-300" />
              </div>

              <div className="max-w-[400px] space-y-1">
                <h3 className="text-[15px] font-semibold text-white tracking-tight drop-shadow-md">
                  SatQuery AI Vision
                </h3>
                <p className="text-[12.5px] text-white/70 leading-relaxed drop-shadow-sm">
                  Ask any question about this satellite scene, or tap anywhere on the globe behind to inspect coordinates.
                </p>
              </div>
            </div>
          ) : (
            /* Conversation Thread */
            messages.map((msg) => (
              <div key={msg.id} className="space-y-2.5">
                {msg.role === "user" ? (
                  /* User Message */
                  <div className="flex flex-col items-end space-y-1.5">
                    {/* Attached Satellite Image Card (if present) */}
                    {msg.attachedImages && msg.attachedImages.length > 0 && (
                      <div className="flex flex-wrap gap-2 justify-end">
                        {msg.attachedImages.map((img, idx) => {
                          const previewUrl = getPreviewUrl(img, "rgb");
                          return (
                            <div
                              key={idx}
                              onClick={() => previewUrl && setEnlargedImage(previewUrl)}
                              className="flex items-center gap-2.5 p-1.5 pr-3 rounded-xl bg-black/40 backdrop-blur-md border border-white/20 cursor-pointer hover:border-cyan-400/50 transition-all shadow-md group"
                            >
                              <div className="w-11 h-11 rounded-lg overflow-hidden bg-black/60 shrink-0 border border-white/20 relative">
                                {previewUrl ? (
                                  <img
                                    src={previewUrl}
                                    alt="Attached satellite scene"
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-white/50">
                                    <Satellite className="w-5 h-5" />
                                  </div>
                                )}
                                <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors" />
                              </div>
                              <div className="text-left">
                                <p className="text-[11.5px] font-medium text-white line-clamp-1 drop-shadow-xs">
                                  {msg.locationName || img.role || "Attached Scene"}
                                </p>
                                <div className="flex items-center gap-1.5 text-[10px] text-white/60">
                                  <span className="uppercase">{img.modality}</span>
                                  {img.date && <span>· {img.date}</span>}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Message Bubble */}
                    <div className="max-w-[85%] rounded-2xl rounded-tr-sm bg-black/40 backdrop-blur-md border border-white/20 px-4 py-2.5 text-[13.5px] text-white shadow-md">
                      <p className="whitespace-pre-wrap leading-relaxed drop-shadow-sm">{msg.text}</p>
                      <div className="text-right mt-1">
                        <span className="text-[9.5px] text-white/50 font-mono">{msg.timestamp}</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Gemini / Assistant Message */
                  <div className="flex items-start gap-2.5">
                    <div className="w-6 h-6 rounded-lg bg-gradient-to-tr from-blue-500 via-indigo-500 to-cyan-400 p-[1px] shrink-0 mt-0.5 shadow-md shadow-cyan-500/20">
                      <div className="w-full h-full bg-black/80 rounded-[6px] flex items-center justify-center">
                        <Sparkles className="w-3 h-3 text-cyan-300" />
                      </div>
                    </div>

                    <div className="flex-1 space-y-2.5 max-w-[92%]">
                      {/* Error Box */}
                      {msg.isError ? (
                        <div className="p-3.5 rounded-xl bg-red-950/60 backdrop-blur-md border border-red-500/30 text-red-200 text-[13px] leading-relaxed">
                          {msg.text}
                        </div>
                      ) : (
                        /* Rich AI Response in Frosted Glass */
                        <div className="p-4 rounded-2xl rounded-tl-sm bg-black/35 backdrop-blur-md border border-white/15 shadow-xl space-y-3">
                          {/* Main Markdown Text */}
                          <div className="text-[13.5px] text-white/95 leading-relaxed whitespace-pre-wrap drop-shadow-xs">
                            {msg.text}
                          </div>

                          {/* Land Cover Metric Badges (if available in trace) */}
                          {msg.trace?.analysis?.available && msg.trace.analysis.scene?.cover && (
                            <div className="pt-2 border-t border-white/10">
                              <p className="text-[10.5px] font-mono tracking-wider text-white/60 uppercase mb-2">
                                Measured Spectral Cover
                              </p>
                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                {Object.entries(msg.trace.analysis.scene.cover).map(([key, data]) => {
                                  let color = "text-emerald-300 border-emerald-500/30 bg-emerald-500/10";
                                  if (key.includes("built")) color = "text-amber-300 border-amber-500/30 bg-amber-500/10";
                                  if (key.includes("water")) color = "text-cyan-300 border-cyan-500/30 bg-cyan-500/10";
                                  if (key.includes("bare")) color = "text-stone-300 border-stone-500/30 bg-stone-500/10";

                                  return (
                                    <div key={key} className={`px-2.5 py-1.5 rounded-lg border backdrop-blur-xs text-center ${color}`}>
                                      <p className="text-[9.5px] uppercase font-mono tracking-wider opacity-90">
                                        {key}
                                      </p>
                                      <p className="text-[14px] font-bold mt-0.5">{data.pct.toFixed(1)}%</p>
                                      <p className="text-[9px] opacity-70">{data.km2.toFixed(2)} km²</p>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          {/* Satellite Models & Reasoning Dropdown */}
                          {msg.trace && (
                            <div className="pt-0.5">
                              <button
                                onClick={() => toggleReasoning(msg.id)}
                                className="flex items-center gap-1.5 text-[11px] text-cyan-300 hover:text-cyan-200 font-mono transition-colors drop-shadow-xs"
                              >
                                <span>
                                  {expandedReasoning[msg.id] ? "Hide" : "Show"} reasoning & pipeline (
                                  {msg.trace.models_invoked.length} models · {msg.trace.total_ms}ms)
                                </span>
                                {expandedReasoning[msg.id] ? (
                                  <ChevronUp className="w-3 h-3" />
                                ) : (
                                  <ChevronDown className="w-3 h-3" />
                                )}
                              </button>

                              {expandedReasoning[msg.id] && (
                                <div className="mt-2 p-3 rounded-xl bg-black/60 backdrop-blur-md border border-white/15 space-y-2 text-[11.5px] font-mono text-neutral-300 animate-slide-up">
                                  <div className="flex flex-wrap items-center gap-2 text-[10px]">
                                    <span className="text-white/50">MODELS:</span>
                                    {msg.trace.models_invoked.map((m) => (
                                      <span
                                        key={m}
                                        className="px-1.5 py-0.5 rounded bg-white/10 text-cyan-300 border border-white/15"
                                      >
                                        {m}
                                      </span>
                                    ))}
                                    {msg.trace.confidence && (
                                      <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                        {(msg.trace.confidence * 100).toFixed(0)}% CONFIDENCE
                                      </span>
                                    )}
                                  </div>

                                  {msg.trace.steps && msg.trace.steps.length > 0 && (
                                    <div className="space-y-1 pt-1 border-t border-white/10">
                                      {msg.trace.steps.map((step, sIdx) => (
                                        <div key={sIdx} className="flex items-start justify-between text-[10.5px]">
                                          <span className="text-white/70">
                                            {sIdx + 1}. {step.node} ({step.model_id || "rule"})
                                          </span>
                                          <span className="text-white/50">{step.latency_ms}ms</span>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          )}

                          {/* Footer Controls: Copy, Timestamp */}
                          <div className="flex items-center justify-between pt-0.5 text-[10.5px] text-white/50">
                            <span className="font-mono">{msg.timestamp}</span>
                            <button
                              onClick={() => handleCopy(msg.id, msg.text)}
                              className="flex items-center gap-1 hover:text-white transition-colors"
                            >
                              {copiedId === msg.id ? (
                                <>
                                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                                  <span className="text-emerald-400">Copied</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3.5 h-3.5" />
                                  <span>Copy</span>
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))
          )}

          {/* Querying / Thinking State */}
          {isQuerying && (
            <div className="flex items-start gap-2.5 animate-pulse">
              <div className="w-6 h-6 rounded-lg bg-gradient-to-tr from-blue-500 via-indigo-500 to-cyan-400 p-[1px] shrink-0 mt-0.5">
                <div className="w-full h-full bg-black/80 rounded-[6px] flex items-center justify-center">
                  <Sparkles className="w-3 h-3 text-cyan-300 animate-spin" />
                </div>
              </div>
              <div className="p-3.5 rounded-2xl rounded-tl-sm bg-black/40 backdrop-blur-md border border-white/20 shadow-lg space-y-2 max-w-[80%]">
                <div className="flex items-center gap-2 text-cyan-300 text-[12.5px] font-medium">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-cyan-400" />
                  <span>Interrogating satellite neural models...</span>
                </div>
                <div className="h-1.5 w-44 bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full w-full bg-gradient-to-r from-blue-500 via-cyan-400 to-indigo-500 animate-[pulse_1s_ease-in-out_infinite]" />
                </div>
              </div>
            </div>
          )}

          <div ref={chatBottomRef} />
        </div>
      )}

      {/* Floating Image Attachment Dock + Input Box in Clear Glassmorphism */}
      <div className="relative z-20 p-2.5 sm:p-3.5 border-t border-white/10 bg-black/30 backdrop-blur-md space-y-2">
        {/* Attached Satellite Image Dock */}
        {currentImage ? (
          <div className="flex items-center justify-between px-3 py-1.5 rounded-xl bg-black/40 backdrop-blur-md border border-white/20 shadow-md animate-slide-up">
            <div className="flex items-center gap-2.5 min-w-0">
              <div
                onClick={() => {
                  const url = getPreviewUrl(currentImage, bandMode);
                  if (url) setEnlargedImage(url);
                }}
                className="w-9 h-9 rounded-lg overflow-hidden bg-black shrink-0 border border-white/20 relative cursor-pointer group"
                title="Click to expand"
              >
                <img
                  src={getPreviewUrl(currentImage, bandMode)}
                  alt="Attached scene"
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                />
                <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors flex items-center justify-center">
                  <Maximize2 className="w-3 h-3 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-[12px] font-semibold text-white truncate drop-shadow-xs">
                    {selectedLocationName || currentImage.role || "Orbital Satellite Scene"}
                  </p>
                  <span className="px-1.5 py-0.2 rounded text-[9px] font-mono uppercase bg-white/10 text-cyan-300 border border-white/15">
                    {currentImage.modality}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-[10px] text-white/60">
                  <span>{currentImage.date || "Acquired"}</span>
                  {availableImages.length > 1 && (
                    <span className="text-cyan-300">· {availableImages.length} scenes</span>
                  )}
                </div>
              </div>
            </div>

            {/* Quick Band Switcher + Detach */}
            <div className="flex items-center gap-1.5">
              <div className="hidden sm:flex items-center bg-black/50 backdrop-blur-xs rounded-lg p-0.5 border border-white/15 text-[9.5px] font-mono">
                {(["rgb", "cir", "ndvi"] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => setBandMode(m)}
                    className={`px-1.5 py-0.5 rounded uppercase transition-colors ${
                      bandMode === m ? "bg-white text-black font-bold" : "text-white/60 hover:text-white"
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>

              <button
                onClick={onClearAttachedImage}
                title="Detach image"
                className="p-1 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ) : isFetchingImage ? (
          /* Pulsing Image Acquisition Status */
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-black/40 backdrop-blur-md border border-white/15 text-cyan-300 text-[11.5px] animate-pulse">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-cyan-400" />
            <span>Acquiring orbital imagery...</span>
          </div>
        ) : null}

        {/* Input Composer Box with Clear Frosted Glass */}
        <div className="relative rounded-2xl bg-black/35 backdrop-blur-md border border-white/20 focus-within:border-white/40 focus-within:ring-1 focus-within:ring-white/20 transition-all shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]">
          <textarea
            ref={textareaRef}
            rows={1}
            value={queryInput}
            onChange={(e) => setQueryInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              currentImage
                ? "Ask anything about this satellite scene (e.g. land cover, water bodies)..."
                : "Select a location on the globe or type your question..."
            }
            className="w-full resize-none bg-transparent px-3.5 pt-3 pb-9 text-[13.5px] text-white placeholder-white/50 focus:outline-none scrollbar-none drop-shadow-xs"
            style={{ minHeight: "50px", maxHeight: "120px" }}
          />

          {/* Bottom Action Bar inside Composer */}
          <div className="absolute left-2.5 right-2.5 bottom-1.5 flex items-center justify-between">
            {/* Attachment Button */}
            <div className="flex items-center gap-2">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept=".tif,.tiff,.png,.jpg,.jpeg"
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                title="Upload custom satellite image (.tif, .png, .jpg)"
                className="p-1 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-all flex items-center gap-1 text-[11px]"
              >
                <Paperclip className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Upload Image</span>
              </button>

              {currentImage && (
                <span className="hidden md:inline text-[10px] text-white/50 font-mono">
                  Press Enter to send
                </span>
              )}
            </div>

            {/* Send Button */}
            <button
              onClick={handleSubmit}
              disabled={!queryInput.trim() || isQuerying}
              className={`p-1.5 rounded-xl flex items-center justify-center transition-all ${
                queryInput.trim() && !isQuerying
                  ? "bg-white text-black shadow-[0_0_15px_rgba(255,255,255,0.3)] hover:bg-neutral-200 active:scale-95"
                  : "bg-white/10 text-white/30 cursor-not-allowed"
              }`}
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Fullscreen Image Preview Modal */}
      {enlargedImage && (
        <div
          onClick={() => setEnlargedImage(null)}
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-6 animate-fade-in"
        >
          <div className="relative max-w-4xl max-h-[85vh] rounded-2xl overflow-hidden border border-white/20 shadow-2xl bg-black">
            <button
              onClick={() => setEnlargedImage(null)}
              className="absolute top-3 right-3 z-10 p-2 rounded-full bg-neutral-900 text-white hover:bg-neutral-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <img
              src={enlargedImage}
              alt="Enlarged satellite inspection"
              className="w-full h-full object-contain"
            />
          </div>
        </div>
      )}
    </div>
  );
}
