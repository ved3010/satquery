/**
 * Typed client for the FastAPI service in serve/.
 *
 * Every call goes to /api/*, which next.config.ts rewrites to the Python
 * service. One origin in the browser means no CORS, and swapping the backend
 * for a hosted one is an environment variable rather than a code change.
 */

export type Health = {
  status: string;
  models_registered: number;
  models_trained: string[];
  mandatory_coverage: Record<string, string[]>;
};

export type Model = {
  id: string;
  name: string;
  version: string;
  tasks: string[];
  modalities: string[];
  n_images: number;
  runtime: string;
  params_m: number | null;
  trained: boolean;
  metrics: Record<string, unknown>;
  notes: string;
};

export type ImageRef = {
  path: string;
  modality: "optical" | "sar";
  date?: string | null;
  role?: string;
  preview?: string;
};

export type Scene = {
  id: string;
  collection: string;
  date: string;
  cloud: number | null;
};

export type AoiResult = {
  images: ImageRef[];
  scenes: Scene[];
  aoi: number[];
  warnings?: string[];
  size_px?: [number, number];
  ground_km?: [number, number];
  error?: string;
};

export type Step = {
  node: string;
  model_id: string | null;
  model_name: string | null;
  model_version: string | null;
  params: Record<string, unknown>;
  outcome: string;
  confidence: number | null;
  latency_ms: number;
  error: string | null;
};

export type CoverEntry = { pct: number; km2: number; pixels: number };

export type Analysis = {
  available: boolean;
  reason?: string;
  mode?: "single" | "bi-temporal";
  gsd_m: number;
  method?: string;
  thresholds?: Record<string, number>;
  dates?: (string | null)[];
  scene?: { area_km2: number; cover: Record<string, CoverEntry>; mean_ndvi: number; mean_mndwi: number; mean_ndbi: number };
  t1?: { cover: Record<string, CoverEntry> };
  t2?: { cover: Record<string, CoverEntry> };
  change?: {
    area_km2: number;
    transitioned_pct: number;
    classes: Record<
      string,
      { t1_pct: number; t2_pct: number; t1_km2: number; t2_km2: number; delta_pp: number; relative_pct: number | null }
    >;
    vegetation_index_change: { mean_dndvi: number; gain_pct: number; loss_pct: number; changed_pct: number };
    water_index_change: { mean_dmndwi: number; gain_pct: number; loss_pct: number };
    new_built_up: { km2: number; pct_of_scene: number; converted_from_pct: Record<string, number> };
  };
};

export type Trace = {
  run_id: string;
  started: string;
  query: string;
  input_config: string;
  n_images: number;
  task: string | null;
  models_invoked: string[];
  answer: string;
  confidence: number | null;
  rejected: string | null;
  evidence: string[];
  aoi: string | null;
  analysis: Analysis;
  total_ms: number;
  steps: Step[];
  markdown: string;
};

export type RunSummary = {
  run_id: string;
  query: string;
  task: string | null;
  input_config: string;
  models_invoked: string[];
  confidence: number | null;
  total_ms: number;
  rejected: string | null;
};

/*
  Where the browser sends its requests.

  Default is the same-origin /api rewrite, which needs no CORS. Set
  NEXT_PUBLIC_SATQUERY_API to an absolute URL to talk to the service directly
  instead -- required on Vercel, where there is no Python process to rewrite
  to, and safer locally for the AOI fetch: reading twelve Sentinel bands off S3
  can take a minute, and the Next dev proxy drops a connection that slow.
*/
const BASE = (process.env.NEXT_PUBLIC_SATQUERY_API ?? "/api").replace(/\/$/, "");

export const API_BASE = BASE;
export const IS_DIRECT = BASE !== "/api";

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) {
    // FastAPI puts the useful message in `detail`; surfacing the raw status
    // instead would turn "AOI is too large" into "422", which tells the user
    // nothing about what to do next.
    let detail = `HTTP ${res.status}`;
    try {
      const body = await res.json();
      if (body?.detail) detail = typeof body.detail === "string" ? body.detail : JSON.stringify(body.detail);
    } catch {
      /* non-JSON error body — keep the status line */
    }
    throw new Error(detail);
  }
  return res.json() as Promise<T>;
}

export const api = {
  health: () => fetch(`${BASE}/health`, { cache: "no-store" }).then(json<Health>),

  models: () => fetch(`${BASE}/models`, { cache: "no-store" }).then(json<Model[]>),

  runs: (limit = 8) =>
    fetch(`${BASE}/runs?limit=${limit}`, { cache: "no-store" }).then(json<RunSummary[]>),

  upload: (file: File) => {
    const fd = new FormData();
    fd.append("file", file);
    return fetch(`${BASE}/upload`, { method: "POST", body: fd }).then(
      json<{ path: string; filename: string; bytes: number; modality: string | null }>,
    );
  },

  aoiFetch: (body: {
    bbox: number[];
    start: string;
    end: string;
    max_cloud: number;
    want_sar: boolean;
    start2?: string | null;
    end2?: string | null;
  }) =>
    fetch(`${BASE}/aoi/fetch`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).then(json<AoiResult>),

  query: (query: string, images: ImageRef[]) =>
    fetch(`${BASE}/query`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query,
        images: images.map((i) => ({ path: i.path, modality: i.modality, date: i.date ?? null })),
      }),
    }).then(json<Trace>),

  reportUrl: (runId: string) => `${BASE}/runs/${runId}/report.md`,
  previewUrl: (path: string, mode: "rgb" | "cir" | "swir" | "ndvi" = "rgb") =>
    `${BASE}/preview?path=${encodeURIComponent(path)}${mode !== "rgb" ? `&mode=${mode}` : ""}`,
};

export function getPreviewUrl(img: ImageRef, mode: "rgb" | "cir" | "swir" | "ndvi" = "rgb"): string {
  if (img.path) {
    return api.previewUrl(img.path, mode);
  }
  if (img.preview) {
    return img.preview.startsWith("http") ? img.preview : `${BASE}${img.preview}`;
  }
  return "";
}

/** The eight IndiaSat regions, as map presets. */
export const REGIONS = [
  { key: "ahmedabad", name: "Ahmedabad", state: "Gujarat", lat: 23.03, lon: 72.58, zone: "Arid, steppe, hot" },
  { key: "guwahati", name: "Guwahati", state: "Assam", lat: 26.14, lon: 91.74, zone: "Humid subtropical" },
  { key: "jaisalmer", name: "Jaisalmer", state: "Rajasthan", lat: 26.92, lon: 70.91, zone: "Arid desert, hot" },
  { key: "kochi", name: "Kochi", state: "Kerala", lat: 9.93, lon: 76.27, zone: "Tropical monsoon" },
  { key: "ludhiana", name: "Ludhiana", state: "Punjab", lat: 30.9, lon: 75.86, zone: "Semi-arid" },
  { key: "pune", name: "Pune", state: "Maharashtra", lat: 18.52, lon: 73.86, zone: "Tropical savannah" },
  { key: "shimla", name: "Shimla", state: "Himachal Pradesh", lat: 31.1, lon: 77.17, zone: "Montane" },
  { key: "sundarbans", name: "Sundarbans", state: "West Bengal", lat: 21.95, lon: 88.9, zone: "Mangrove delta" },
] as const;

export const EXAMPLE_QUERIES = [
  { label: "Land cover", text: "Describe the land-cover and major objects visible in this image." },
  { label: "Change", text: "What changed between these two dates, and where did the change occur?" },
  { label: "Urban growth", text: "Has the built-up area increased, decreased, or remained unchanged?" },
  { label: "Optical + SAR", text: "Use the optical and SAR images together to identify built-up and water-covered regions." },
  { label: "Grounding", text: "Highlight the water body referred to in this query." },
] as const;
