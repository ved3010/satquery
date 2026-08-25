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
  Video,
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
  hasCctvFeed?: boolean;
  onOpenDualCockpit?: () => void;
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
  hasCctvFeed,
  onOpenDualCockpit,
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
    const lower = trimmed.toLowerCase();
    if (
      (lower.includes("cctv") || lower.includes("footage") || lower.includes("camera") || lower.includes("street view") || lower.includes("live feed")) &&
      hasCctvFeed &&
      onOpenDualCockpit
    ) {
      onOpenDualCockpit();
    }
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
