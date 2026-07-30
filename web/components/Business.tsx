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
                </div>

                <p className="mt-5 text-[14px] leading-[1.72] text-[var(--color-mute)]">
                  <span className="text-[var(--color-dim)]">{m.definition}</span> {m.body}
                </p>

                <p className="mono mt-4 text-[11px] leading-[1.6] text-[var(--color-mute)]">
                  Source:{" "}
                  {m.href ? (
                    <a
                      href={m.href}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="underline decoration-white/20 underline-offset-2 transition-colors hover:text-white"
                    >
                      {m.source}
                    </a>
                  ) : (
                    m.source
                  )}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>

      {/* ------------------------------------------------------- context */}
      <div className="mt-14 grid gap-px overflow-hidden rounded-lg border border-[var(--color-line)] bg-[var(--color-line)] sm:grid-cols-2 lg:grid-cols-4">
        {MARKET_CONTEXT.map((c, i) => (
          <Reveal key={c.label} delay={i * 55}>
            <div className="h-full bg-black p-6">
              <p className="text-[17px] font-medium tabular-nums tracking-tight text-white">
                {c.value}
              </p>
              <p className="mono mt-2 text-[10.5px] tracking-[0.1em] text-[var(--color-brand-soft)]">
                {c.cagr.toUpperCase()}
              </p>
              <p className="mt-3 text-[13px] leading-[1.6] text-[var(--color-mute)]">
                {c.label}
              </p>
              <p className="mono mt-3 text-[10px] text-[var(--color-mute)]">{c.source}</p>
            </div>
          </Reveal>
        ))}
      </div>

      {/* ------------------------------------------------------- revenue */}
      <Reveal>
        <p className="eyebrow mt-24">How it makes money</p>
        <h3 className="display mt-4 max-w-[24ch] text-[clamp(1.4rem,2.6vw,1.95rem)] text-white">
          Open core. Revenue from operating it, not from locking it.
        </h3>
      </Reveal>

      <div className="mt-10 grid gap-px overflow-hidden rounded-lg border border-[var(--color-line)] bg-[var(--color-line)] lg:grid-cols-3">
        {REVENUE.map((p, i) => (
          <Reveal key={p.id} delay={i * 80}>
            <div
              className={`flex h-full flex-col p-7 sm:p-8 ${
                p.featured ? "bg-[#07090f]" : "bg-black"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="mono text-[10.5px] tracking-[0.16em] text-[var(--color-mute)]">
                  {p.tier.toUpperCase()}
                </span>
                {p.featured && (
                  <span className="mono rounded-full bg-[var(--color-brand)]/18 px-2.5 py-1 text-[9.5px] tracking-[0.14em] text-[var(--color-brand-soft)]">
                    PRIMARY
                  </span>
                )}
              </div>
              <h4 className="mt-5 text-[19px] font-medium text-white">{p.name}</h4>
              <p className="mt-3 flex items-baseline gap-2">
                <span className="text-[26px] font-medium tracking-tight text-white">
                  {p.price}
                </span>
                <span className="text-[12.5px] text-[var(--color-mute)]">{p.cadence}</span>
              </p>
              <p className="mt-4 text-[13.5px] leading-[1.7] text-[var(--color-mute)]">
                {p.desc}
              </p>
              <ul className="mt-6 space-y-2.5 border-t border-[var(--color-line)] pt-6">
                {p.features.map((f) => (
                  <li
                    key={f}
                    className="flex gap-2.5 text-[13px] leading-[1.6] text-[var(--color-dim)]"
                  >
                    <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-[var(--color-brand-soft)]" />
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>
        ))}
      </div>

      <Reveal>
        <p className="mt-6 max-w-[74ch] text-[13.5px] leading-[1.72] text-[var(--color-mute)]">
          {REVENUE_NOTE}
        </p>
      </Reveal>

      {/* ---------------------------------------------------------- moat */}
      <Reveal>
        <p className="eyebrow mt-24">Why it holds</p>
      </Reveal>
      <div className="mt-8 grid gap-px overflow-hidden rounded-lg border border-[var(--color-line)] bg-[var(--color-line)] sm:grid-cols-2 lg:grid-cols-4">
        {MOAT.map((m, i) => (
          <Reveal key={m.title} delay={i * 60}>
            <div className="h-full bg-black p-6">
              <h4 className="text-[15.5px] font-medium leading-snug text-white">
                {m.title}
              </h4>
              <p className="mt-3 text-[13.5px] leading-[1.7] text-[var(--color-mute)]">
                {m.body}
              </p>
            </div>
          </Reveal>
        ))}
      </div>
    </Section>
  );
}
