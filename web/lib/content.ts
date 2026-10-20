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
    tag: "VQA · CAPTIONING",
    title: "Single-image understanding",
    body: "Ask what a scene contains, what dominates its land cover, or what a structure is — answered from one optical or SAR observation, with scene description alongside.",
  },
  {
    n: "02",
    tag: "OPTICAL + SAR",
    title: "Cross-modal analysis",
    body: "Optical carries spectral context; SAR carries structure and sees through cloud, day or night. Read together they resolve built-up and water regions that either alone leaves ambiguous.",
  },
  {
    n: "03",
    tag: "BI-TEMPORAL",
    title: "Multitemporal change",
    body: "Two co-registered dates become a question about what changed, where, and by how much — with a change mask as the spatial evidence.",
  },
  {
    n: "04",
    tag: "REFERRING EXPRESSION",
    title: "Text-guided grounding",
    body: "“The water body north of the settlement” resolves to a box on the scene, so the answer points at something rather than merely describing it.",
  },
  {
    n: "05",
    tag: "TASK ROUTING",
    title: "Agentic orchestration",
    body: "The question decides the pipeline, not the developer. A LangGraph state machine classifies, validates, selects, sequences and integrates — and checkpoints every transition.",
  },
  {
    n: "06",
    tag: "AUDITABLE TRACE",
    title: "Evidence-grounded results",
    body: "Every run writes a Markdown report carrying the measured table, the models invoked, the resolved parameters and per-step latency and confidence.",
  },
];

/* Why the measured section exists, in one paragraph the judges can quote. */
export const MEASURED = {
  kicker: "Real numbers",
  title: "The percentages are measured, not generated.",
  body: "Vegetation, urbanisation and water figures are computed from Sentinel-2 surface reflectance using NDVI, MNDWI (Xu 2006) and NDBI (Zha 2003), over the real pixels of the scene the user asked about. The thresholds are published and stated in every report, so a reader can disagree with a number by disagreeing with a threshold rather than by trusting the system. The vision-language model writes the sentence around them; it is never allowed to supply the figure.",
  indices: [
    { code: "NDVI", formula: "(NIR − RED) / (NIR + RED)", reads: "vegetation vigour", rule: "≥ 0.30 dense · 0.18–0.30 sparse" },
    { code: "MNDWI", formula: "(GREEN − SWIR) / (GREEN + SWIR)", reads: "open water", rule: "> 0.00" },
    { code: "NDBI", formula: "(SWIR − NIR) / (SWIR + NIR)", reads: "built-up", rule: "NDBI − NDVI > 0" },
    { code: "ΔIndex", formula: "index(t₂) − index(t₁)", reads: "change between dates", rule: "|Δ| > 0.10" },
  ],
  sample: `| class | 2023-02-10 | 2024-03-15 | Δ pp | Δ relative |
| --- | ---: | ---: | ---: | ---: |
| water | 4.11% | 7.32% | +3.21 | +78.2% |
| vegetation | 23.97% | 17.58% | −6.38 | −26.6% |
| built-up | 23.38% | 19.34% | −4.05 | −17.3% |`,
  sampleNote:
    "An actual report table, from a live Sentinel-2 fetch over an 18.1 km² area of interest. Two acquisitions in different seasons — the seasonal signal is real and the report says so rather than smoothing it away.",
};

export const DATA_NOTE = {
  kicker: "The corpus",
  title: "BigEarthNet contains zero Indian data.",
  body: "Its labels come from CORINE Land Cover, a Europe-only product, so its latitude and longitude ranges do not overlap India at all. Swapping CORINE for ESA WorldCover — 10 m, global, CC-BY-4.0 — reproduces the recipe over India. IndiaSat is 985 patches across eight regions spanning tropical monsoon, arid desert, savannah, humid subtropical and montane: every Köppen zone absent from BigEarthNet, from keyless public sources, annotated in the same schema so the two corpora concatenate into one training mix.",
  stats: [
    { value: "985", label: "patches" },
    { value: "8,962", label: "annotations" },
    { value: "8", label: "regions" },
    { value: "100%", label: "India" },
  ],
};
