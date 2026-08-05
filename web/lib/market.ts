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
    href: "https://www.mordorintelligence.com/industry-reports/geospatial-analytics-market",
  },
  {
    tier: "SAM",
    name: "Geospatial imagery analytics",
    definition:
      "The segment that analyses satellite and aerial imagery specifically — object detection, land-cover classification, change detection and scene understanding. This is the segment SatQuery's models actually compete in.",
    value2025: "US$12.1B",
    value2030: "US$18.6B",
    cagr: "8.9%",
    share: 0.126,
    body:
      "Government is the largest end-user of this segment, contributing roughly 23.8% of 2025 outlays through defence imagery procurement and smart-city programmes — about US$2.9B, growing to ~US$4.4B by 2030 at the same rate. Public-sector Earth-observation decision support is the half of this segment SatQuery is built for.",
    basis: "research",
    source: "MarketsandMarkets — Geospatial Imagery Analytics Market, 2025–2030",
    href: "https://www.marketsandmarkets.com/Market-Reports/geospatial-imagery-analytics-market-221633264.html",
  },
  {
    tier: "SOM",
    name: "Reachable in three years",
    definition:
      "What a team shipping an open-core, on-premise EO assistant can realistically hold as annual recurring revenue by year three.",
    value2025: "—",
    value2030: "US$4–9M ARR",
    cagr: "year-3 target",
    share: 0.0025,
    body:
      "Roughly 0.2% of the public-sector slice of imagery analytics. Bottom-up: 30–45 institutional deployments at US$15–25k per department-year, three to five national-programme engagements, and per-sensor adapter development. Open core removes the evaluation barrier, so revenue starts only after the system is already running on the buyer's own data.",
    basis: "estimate",
    source: "Team bottom-up model — deployments × licence band + programme engagements",
  },
];

/** Context strip under the rings — each one a published figure. */
export const MARKET_CONTEXT = [
  {
    value: "US$37.1B → US$62.9B",
    label: "Geospatial intelligence, 2025 → 2030",
    cagr: "11.1% CAGR",
    source: "MarketsandMarkets",
    basis: "research" as Basis,
  },
  {
    value: "US$12.1B → US$29.6B",
    label: "Satellite data services, 2024 → 2030",
    cagr: "16.3% CAGR",
    source: "Grand View Research",
    basis: "research" as Basis,
  },
  {
    value: "23.8%",
    label: "Government share of imagery-analytics outlays, 2025",
    cagr: "largest end-user segment",
    source: "MarketsandMarkets",
    basis: "research" as Basis,
  },
  {
    value: "US$0",
    label: "Acquisition cost of the imagery SatQuery runs on",
    cagr: "Copernicus Sentinel-1 & 2, open data",
    source: "European Union / ESA",
    basis: "research" as Basis,
  },
];

export const REVENUE = [
  {
    id: "community",
    tier: "Open core",
    name: "Community",
    price: "Free",
    cadence: "self-hosted, forever",
    desc:
      "The agent, the model registry and the trained adapters, under an open licence. For researchers, students and any department evaluating the system.",
    features: [
      "Full agent graph and specialist registry",
      "Open adapter weights",
      "Single-image, cross-modal and bi-temporal tasks",
      "Runs on CPU — no GPU required",
    ],
    featured: false,
  },
  {
    id: "institutional",
    tier: "Per department",
    name: "Institutional",
    price: "US$15–25k",
    cadence: "per year, per deployment",
    desc:
      "An on-premise deployment for a department or agency, with the sensor adaptation and support that operational use needs.",
    features: [
