import {
  MARKET,
  MARKET_CONTEXT,
  MOAT,
  REVENUE,
  REVENUE_NOTE,
  type Basis,
} from "@/lib/market";
import { Head, Section } from "./Sections";
import { Reveal } from "./Chrome";

const BASIS_LABEL: Record<Basis, string> = {
  research: "published research",
  derived: "derived",
  estimate: "team estimate",
};

function BasisTag({ basis }: { basis: Basis }) {
  const tone =
    basis === "research"
      ? "text-[var(--color-verd)] border-[var(--color-verd)]/30"
      : basis === "derived"
        ? "text-[var(--color-brand-soft)] border-[var(--color-brand-soft)]/30"
        : "text-[var(--color-signal)] border-[var(--color-signal)]/30";
  return (
    <span
      className={`mono rounded-full border px-2 py-[3px] text-[9.5px] tracking-[0.14em] ${tone}`}
    >
      {BASIS_LABEL[basis].toUpperCase()}
    </span>
  );
}

/* ------------------------------------------------------- nested rings */
/*
   TAM / SAM / SOM as three concentric circles whose *areas* are proportional
   to the market values. Radius scales with the square root of the share --
   scaling the radius linearly would make SAM look like 12% of TAM when it
   occupies 1.6% of the area, which is the standard way this chart lies.
*/
function Rings() {
  const R = 132;
  const r = (share: number) => Math.max(R * Math.sqrt(share), 7);
  return (
    <svg viewBox="0 0 300 300" className="h-auto w-full max-w-[320px]" role="img"
         aria-label="TAM, SAM and SOM as nested circles with areas proportional to market value">
      <defs>
        <radialGradient id="tam" cx="50%" cy="42%">
          <stop offset="0%" stopColor="#2f7bf0" stopOpacity="0.24" />
          <stop offset="100%" stopColor="#2f7bf0" stopOpacity="0.05" />
        </radialGradient>
      </defs>
      <circle cx="150" cy="150" r={r(1)} fill="url(#tam)" stroke="rgba(127,178,255,0.42)" />
      <circle
        cx="150"
        cy={150 + R - r(MARKET[1].share)}
        r={r(MARKET[1].share)}
        fill="rgba(47,123,240,0.30)"
        stroke="rgba(127,178,255,0.75)"
      />
      <circle
        cx="150"
        cy={150 + R - r(MARKET[2].share)}
        r={r(MARKET[2].share)}
        fill="#a4f4fd"
        stroke="#a4f4fd"
      />
      <text x="150" y="46" textAnchor="middle" className="mono"
            fill="rgba(255,255,255,0.85)" fontSize="11" letterSpacing="2">TAM</text>
      <text x="150" y="238" textAnchor="middle" className="mono"
            fill="rgba(255,255,255,0.85)" fontSize="11" letterSpacing="2">SAM</text>
      <text x="196" y="288" textAnchor="middle" className="mono"
            fill="#a4f4fd" fontSize="11" letterSpacing="2">SOM</text>
      <line x1="164" y1="281" x2="176" y2="284" stroke="#a4f4fd" strokeWidth="0.8" />
    </svg>
  );
}

export function Business() {
  return (
    <Section id="business">
      <Head
        kicker="Business plan"
        title="A global market, entered through the segment the models actually compete in."
        lede="Market studies from different houses disagree by a factor of two on the same words, so each figure below states the definition it belongs to and the house that published it. The one number that is ours is labelled as ours."
      />

      {/* -------------------------------------------------- TAM SAM SOM */}
      <div className="mt-16 grid gap-12 lg:grid-cols-[320px_1fr] lg:gap-16">
        <Reveal className="flex items-start justify-center lg:justify-start">
          <Rings />
        </Reveal>

        <div className="space-y-px overflow-hidden rounded-lg border border-[var(--color-line)] bg-[var(--color-line)]">
          {MARKET.map((m, i) => (
            <Reveal key={m.tier} delay={i * 80}>
              <div className="bg-black p-6 sm:p-8">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="mono text-[13px] font-medium tracking-[0.16em] text-white">
                    {m.tier}
                  </span>
                  <span className="text-[15px] text-[var(--color-dim)]">{m.name}</span>
                  <BasisTag basis={m.basis} />
                </div>

                <div className="mt-5 flex flex-wrap items-baseline gap-x-4 gap-y-2">
                  {m.value2025 !== "—" && (
                    <>
                      <span className="text-[19px] font-medium tabular-nums text-[var(--color-mute)]">
                        {m.value2025}
                      </span>
                      <span className="text-[var(--color-mute)]">→</span>
                    </>
                  )}
                  <span className="text-[clamp(1.6rem,3.2vw,2.15rem)] font-medium tracking-tight tabular-nums text-white">
                    {m.value2030}
                  </span>
                  <span className="mono rounded-full bg-[var(--color-brand)]/15 px-2.5 py-1 text-[11px] tracking-[0.1em] text-[var(--color-brand-soft)]">
                    {m.cagr === "year-3 target" ? "YEAR-3 TARGET" : `${m.cagr} CAGR`}
                  </span>
                  {m.value2025 !== "—" && (
                    <span className="mono text-[11px] text-[var(--color-mute)]">
                      2025 → 2030
                    </span>
                  )}
