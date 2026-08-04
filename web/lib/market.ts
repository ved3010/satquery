/**
 * Business case — global market sizing.
 *
 * SOURCING RULE. Every figure carries its basis:
 *   "research"  — a published third-party market study, named, with the URL
 *   "derived"   — arithmetic on a "research" figure, with the arithmetic shown
 *   "estimate"  — the team's own bottom-up model, shown as an assumption
 *
 * Nothing here is presented as measured company performance, because there is
 * none yet. Market studies from different houses disagree by a factor of two
 * on the same words, so the definition each number belongs to is stated next
 * to it rather than left implicit.
 */

export type Basis = "research" | "derived" | "estimate";

export type MarketTier = {
  tier: "TAM" | "SAM" | "SOM";
  name: string;
  definition: string;
  value2025: string;
  value2030: string;
  cagr: string;
  /** 0–1, used only to size the nested rings. */
  share: number;
  body: string;
  basis: Basis;
  source: string;
  href?: string;
};

export const MARKET: MarketTier[] = [
  {
    tier: "TAM",
    name: "Global geospatial analytics",
    definition:
      "All software, platforms and services that turn location data into decisions — surveying, mapping, GIS, imagery analytics and location intelligence, across every industry.",
    value2025: "US$95.8B",
    value2030: "US$174.4B",
    cagr: "12.7%",
    share: 1,
    body:
      "The whole category SatQuery sits inside. It is far wider than anything one product serves, which is exactly why it is the TAM and not the target.",
    basis: "research",
    source: "Mordor Intelligence — Geospatial Analytics Market, 2025–2030",
