import { HERO } from "@/lib/content";
import { Starfield } from "./Chrome";

export function Hero({ trained, total }: { trained: number; total: number }) {
  return (
    <section
      id="top"
      className="relative isolate flex min-h-[100svh] flex-col items-center overflow-hidden pt-[60px]"
    >
      <Starfield />

      {/* the planet: a huge circle whose top arc crosses the lower viewport */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 top-0 -z-10 overflow-hidden">
        <div className="earth" style={{ top: "70%" }} />
      </div>

      <div className="flex flex-1 flex-col items-center justify-center px-5 pb-[26vh] pt-16 text-center sm:pb-[24vh]">
        <p className="eyebrow">{HERO.eyebrow}</p>

