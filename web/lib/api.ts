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
