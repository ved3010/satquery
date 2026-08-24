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
