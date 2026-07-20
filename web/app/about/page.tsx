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
              >
                <span>Launch Tactical Console</span>
                <ChevronRight className="w-4 h-4" />
              </a>

              <a
                href="https://github.com/ved3010/satquery"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-full border border-[var(--color-line)] bg-white/5 px-6 py-3 text-[14px] font-medium text-white hover:bg-white/10 transition-colors"
              >
                <span>View Source on GitHub</span>
                <ExternalLink className="w-4 h-4 text-[var(--color-mute)]" />
              </a>
            </div>
          </div>
        </section>

        {/* Mission & Organization Overview */}
        <section className="px-5 py-20 sm:px-8 max-w-[1240px] mx-auto border-b border-[var(--color-line)]">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
            <div className="lg:col-span-5 space-y-4">
              <span className="mono text-[11px] uppercase tracking-[0.2em] text-[var(--color-brand)] font-bold">
                The Mandate
              </span>
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-white">
                Built for ISRO &amp; Space Applications Centre
              </h2>
              <p className="text-[14.5px] leading-relaxed text-[var(--color-mute)]">
                Problem Statement <strong>26167</strong> addresses a systemic bottleneck in Earth Observation:
                while Sentinel-1 and Sentinel-2 satellite data is globally updated every few days, translating
                multispectral rasters into verified intelligence currently requires an expert GIS workflow,
                calibrated radiometric pre-processing, and separate single-task vision models.
              </p>
              <div className="p-4 rounded-xl border border-white/10 bg-white/[0.02] space-y-2">
                <div className="flex items-center gap-2 text-white font-semibold text-[13px]">
                  <Award className="w-4 h-4 text-amber-400" />
                  <span>Team TMS&lt;3</span>
                </div>
                <p className="text-[12.5px] text-[var(--color-mute)]">
                  Created by Team TMS&lt;3 for the Smart India Hackathon 2026 Grand Finale. Dedicated to
                  empowering district forest rangers, disaster response coordinators, and urban planners
                  with auditable geospatial AI.
                </p>
              </div>
            </div>

            <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-6 rounded-2xl border border-white/10 bg-white/[0.02] space-y-3">
                <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5 text-cyan-400" />
                </div>
                <h3 className="text-lg font-bold text-white">Measured, Not Generated</h3>
                <p className="text-[13px] text-[var(--color-mute)] leading-relaxed">
                  Quantitative figures never originate from language hallucinations. Land-cover percentages
                  are directly measured from calibrated surface reflectance pixels via published spectral indices (NDVI, MNDWI, NDBI).
                </p>
              </div>

              <div className="p-6 rounded-2xl border border-white/10 bg-white/[0.02] space-y-3">
                <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
                  <Cpu className="w-5 h-5 text-purple-400" />
                </div>
                <h3 className="text-lg font-bold text-white">8 Specialist Models</h3>
                <p className="text-[13px] text-[var(--color-mute)] leading-relaxed">
                  A modular registry of 8 specialist models spanning single-image VQA, scene captioning,
                  referring grounding, bi-temporal change detection, and our lightweight M7 VLM — all CPU-runnable.
                </p>
              </div>

              <div className="p-6 rounded-2xl border border-white/10 bg-white/[0.02] space-y-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                  <Database className="w-5 h-5 text-emerald-400" />
                </div>
                <h3 className="text-lg font-bold text-white">IndiaSat Corpus</h3>
                <p className="text-[13px] text-[var(--color-mute)] leading-relaxed">
                  A 100% Indian benchmark corpus of 985 patches and 8,962 annotations across 8 distinct
                  Köppen climate zones from Jaisalmer to the Sundarbans, replacing Europe-only datasets like BigEarthNet.
                </p>
              </div>

              <div className="p-6 rounded-2xl border border-white/10 bg-white/[0.02] space-y-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                  <Eye className="w-5 h-5 text-blue-400" />
                </div>
                <h3 className="text-lg font-bold text-white">Orbit-to-Ground CCTV</h3>
                <p className="text-[13px] text-[var(--color-mute)] leading-relaxed">
                  A synchronized dual surveillance cockpit pairing 10m Sentinel-2 passes with live street-level
                  municipal CCTV feeds across Pune, Mumbai, Bengaluru, Delhi, and Hyderabad.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 7-Step LangGraph Architecture */}
        <section className="px-5 py-20 sm:px-8 max-w-[1240px] mx-auto border-b border-[var(--color-line)]">
          <div className="space-y-4 max-w-[700px] mb-12">
            <span className="mono text-[11px] uppercase tracking-[0.2em] text-[var(--color-brand)] font-bold">
              The Engine
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-white">
              7-Step Auditable LangGraph Pipeline
            </h2>
            <p className="text-[14.5px] text-[var(--color-mute)]">
              Every query executes across a deterministic LangGraph state machine. Each state transition
              is checkpointed, producing an auditable trace in Markdown and Obsidian vault format.
            </p>
