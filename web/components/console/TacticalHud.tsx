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
