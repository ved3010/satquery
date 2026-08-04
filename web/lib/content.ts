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
      body: "Land-cover classification, object detection, question answering and change detection ship as separate single-task systems, each with its own inputs, formats and operators. Nothing composes.",
    },
    {
      n: "02",
      title: "The pre-processing is the job",
      body: "Twelve bands, an unknown projection, a ground sample distance to reconcile, speckle to filter, two dates to co-register. The analysis is the short part.",
    },
    {
      n: "03",
      title: "Answers arrive without evidence",
      body: "A raster comes back. Which model produced it, at what threshold, with what confidence — none of that survives to the person making the decision.",
    },
    {
      n: "04",
      title: "So the people who need it cannot use it",
      body: "A district officer, a forest ranger, a relief coordinator during a monsoon flood. They have the question and the mandate. They do not have the GIS toolchain or the week.",
    },
  ],
};

/* -------------------------------------------------------------- solution */
export const PIPELINE = [
  { step: "01", title: "INGEST", body: "Read modality, band count, projection, ground sample distance and acquisition dates from the file itself." },
  { step: "02", title: "VALIDATE", body: "Check that the inputs can answer the question at all. A change query with one image is refused, with the reason stated." },
  { step: "03", title: "ROUTE", body: "Classify the query into one of five task families and select specialists from a declared registry — the router's only source of models." },
  { step: "04", title: "EXECUTE", body: "Run the selected specialists in order, each producing text, a mask, a box or band statistics as its native output." },
  { step: "05", title: "MEASURE", body: "Compute land cover from the pixels with published spectral indices. Not a model — arithmetic anyone can reproduce from the same scene." },
  { step: "06", title: "SYNTHESISE", body: "The VLM narrates what the specialists found. It never supplies a number; every percentage comes from the measure step." },
  { step: "07", title: "EXPLAIN", body: "Return the answer, the measured table, and the execution trace: task, models, parameters, latency, confidence." },
];

export const CAPABILITIES = [
  {
    n: "01",
