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
