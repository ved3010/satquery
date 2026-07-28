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
