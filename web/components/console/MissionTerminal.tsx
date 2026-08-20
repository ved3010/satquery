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
