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

        <h1 className="display mt-7 max-w-[19ch] text-[clamp(2.1rem,6.2vw,4.05rem)] text-white">
          {HERO.title.map((line) => (
            <span key={line} className="block">
              {line}
            </span>
          ))}
        </h1>

        <p className="mt-7 max-w-[58ch] text-[15px] leading-[1.65] text-[var(--color-mute)] sm:text-[16.5px]">
          {HERO.sub}
        </p>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-x-7 gap-y-4">
          <a
            href={HERO.cta.href}
            className="group inline-flex items-center gap-2 text-[15px] text-white transition-opacity hover:opacity-70"
          >
            {HERO.cta.label}
            <span className="transition-transform duration-300 group-hover:translate-x-1">
              →
            </span>
          </a>
          <span className="mono text-[11.5px] tracking-[0.12em] text-[var(--color-mute)]">
            {trained}/{total} MODELS TRAINED · MEASURED, NOT ASSERTED
          </span>
        </div>
      </div>
    </section>
  );
}
