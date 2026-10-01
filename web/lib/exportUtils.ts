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
        coordinates: f.coords, // [longitude, latitude]
      },
      properties: {
        id: f.id,
        name: f.name,
        category: f.category,
        changeType: f.changeType,
        confidence: f.confidence,
        ndvi: f.ndvi,
        ndbi: f.ndbi,
        mndwi: f.mndwi,
        areaHectares: f.areaHectares,
        description: f.description,
      },
    })),
  };

  return JSON.stringify(geojson, null, 2);
}

/**
 * Exports detected features as tabular CSV format for GIS tools (QGIS, ArcGIS)
 */
export function exportFeaturesToCsv(features: DetectedFeaturePoint[]): string {
  const headers = [
    "ID",
    "Name",
    "Longitude",
    "Latitude",
    "Category",
    "ChangeType",
    "Confidence",
    "NDVI",
    "NDBI",
    "MNDWI",
    "Area_Hectares",
    "Description",
  ];

  const rows = features.map((f) => [
    f.id,
    `"${f.name.replace(/"/g, '""')}"`,
    f.coords[0].toFixed(6),
    f.coords[1].toFixed(6),
    f.category,
    `"${f.changeType.replace(/"/g, '""')}"`,
    f.confidence.toFixed(2),
    f.ndvi.toFixed(3),
