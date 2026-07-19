import { Nav, Starfield } from "@/components/Chrome";
import { Footer } from "@/components/Footer";
import data from "@/lib/models.json";
import {
  Satellite,
  ShieldCheck,
  Cpu,
  Layers,
  MapPin,
  Eye,
  Activity,
  Award,
  Terminal,
  Database,
  ExternalLink,
  ChevronRight,
  Sparkles,
} from "lucide-react";

export const metadata = {
  title: "About | SatQuery AI",
  description:
    "About SatQuery AI — Agentic vision-language assistant for multimodal remote sensing. SIH 2026 Problem Statement 26167, ISRO / Space Applications Centre.",
};

export default function AboutPage() {
  return (
    <>
      <Nav />
      <main className="relative min-h-screen pt-[60px] text-white overflow-hidden">
        <Starfield />

        {/* Hero Section */}
        <section className="relative px-5 pt-16 pb-20 sm:px-8 max-w-[1240px] mx-auto border-b border-[var(--color-line)]">
          <div className="max-w-[800px] space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-cyan-500/30 bg-cyan-950/20 text-cyan-300 font-mono text-[11px] tracking-wider uppercase">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              <span>Smart India Hackathon 2026 · PS 26167</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-[1.1]">
              About <span className="gradient-text">SatQuery AI</span>
            </h1>

            <p className="text-[17px] sm:text-[19px] leading-relaxed text-[var(--color-dim)]">
              An agentic vision-language assistant for multimodal remote sensing — optical,
              synthetic aperture radar (SAR), and bi-temporal satellite imagery, interrogated
              in plain language and answered with measured evidence and a full execution trace.
            </p>

            <div className="flex flex-wrap items-center gap-4 pt-2">
              <a
                href="/console"
                className="inline-flex items-center gap-2 rounded-full bg-[var(--color-brand)] px-6 py-3 text-[14px] font-medium text-white transition-all hover:bg-[#4b8ef5] shadow-[0_0_20px_rgba(47,123,240,0.4)]"
