/**
 * Geospatial Export Utilities for SatQuery Analysis
 * Allows analysts to download detected features as GeoJSON, CSV, or markdown summaries.
 */

import type { DetectedFeaturePoint } from "./spatialAnalysis";
import type { Trace } from "./api";

/**
 * Exports detected spatial feature points into standard GeoJSON FeatureCollection
 */
export function exportFeaturesToGeoJson(features: DetectedFeaturePoint[], runId?: string): string {
  const geojson = {
    type: "FeatureCollection",
    metadata: {
      generatedBy: "SatQuery AI",
      runId: runId || `run-${Date.now()}`,
      timestamp: new Date().toISOString(),
      featureCount: features.length,
    },
    features: features.map((f) => ({
      type: "Feature",
      geometry: {
        type: "Point",
