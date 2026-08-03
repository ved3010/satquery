/**
 * Narrative content.
 *
 * The problem statement is PS 26167 (SIH 2026, ISRO / Space Applications
 * Centre). Everything under SOLUTION describes what the code in this
 * repository actually does — if a claim here is not backed by a module in
 * agent/, models/ or serve/, it does not belong on the page.
 */

export const NAV = [
  { label: "Problem", href: "/#problem" },
  { label: "Solution", href: "/#solution" },
  { label: "Models", href: "/#models" },
  { label: "Business", href: "/#business" },
  { label: "About", href: "/about" },
] as const;

export const HERO = {
  eyebrow: "SIH 2026 · PS 26167 · ISRO / Space Applications Centre",
  title: ["Ask Earth a question.", "Get an auditable answer."],
  sub: "An agentic vision-language assistant for multimodal remote sensing. Optical, SAR and bi-temporal imagery, interrogated in plain language and answered with the evidence it rests on.",
  cta: { label: "See how it works", href: "#solution" },
};

/* --------------------------------------------------------------- problem */
export const PROBLEM = {
  kicker: "The problem",
  title: "The archive is open. The ability to interrogate it is not.",
  lede: "Sentinel-1 and Sentinel-2 imagery is free and global. Turning one scene into one answer is still a specialist's day of work.",
  points: [
    {
      n: "01",
      title: "One model per task, per sensor",
