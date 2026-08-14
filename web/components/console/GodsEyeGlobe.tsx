"use client";

import { useEffect, useRef, useState } from "react";
import * as maplibregl from "maplibre-gl";
import type { Map as MapLibreMap, GeoJSONSource } from "maplibre-gl";
import { Satellite, Layers, ZoomIn, ZoomOut, Play, Pause, Compass, MapPin, Sparkles, Eye, Activity, Crop } from "lucide-react";
import type { DetectedFeaturePoint } from "@/lib/spatialAnalysis";
import { PointInspectorHud } from "./PointInspectorHud";

export type SensorLayer = "optical" | "sar" | "ndvi" | "night" | "tactical";

export type TargetPreset = {
  name: string;
  region: string;
  coords: [number, number]; // [lng, lat]
  bbox: number[]; // [w, s, e, n]
  zoom: number;
  pitch: number;
  description: string;
};

export const TARGET_PRESETS: TargetPreset[] = [
  {
    name: "Bengaluru Tech Corridor",
    region: "Karnataka, India",
    coords: [77.5946, 12.9716],
    bbox: [77.48, 12.85, 77.72, 13.08],
    zoom: 12.0,
    pitch: 48,
    description: "Silicon Valley of India · Whitefield, Electronic City & Lake Catchments",
  },
  {
    name: "Delhi NCR Agglomeration",
    region: "National Capital Region, India",
    coords: [77.2090, 28.6139],
    bbox: [76.95, 28.40, 77.45, 28.85],
    zoom: 11.5,
    pitch: 50,
    description: "Cyber City Gurgaon, Dwarka Expressway & Yamuna Floodplains",
  },
  {
    name: "Mumbai Coastal Peninsula",
    region: "Maharashtra, India",
    coords: [72.8777, 19.0760],
    bbox: [72.76, 18.88, 73.02, 19.25],
    zoom: 11.8,
    pitch: 54,
    description: "BKC Financial Core, Navi Mumbai Airport & Coastal Reclamation",
  },
  {
    name: "Hyderabad Cyberabad",
    region: "Telangana, India",
    coords: [78.4867, 17.3850],
    bbox: [78.30, 17.25, 78.62, 17.55],
    zoom: 12.0,
    pitch: 50,
    description: "HITEC City, Gachibowli Financial District & Genome Valley",
  },
  {
    name: "Ahmedabad & GIFT City",
    region: "Gujarat, India",
    coords: [72.5714, 23.0225],
    bbox: [72.48, 22.95, 72.68, 23.18],
    zoom: 12.5,
    pitch: 52,
    description: "GIFT City FinTech SEZ, SG Highway & Sabarmati Riverfront",
  },
  {
    name: "Chennai OMR & Ports",
    region: "Tamil Nadu, India",
    coords: [80.2707, 13.0827],
    bbox: [80.12, 12.85, 80.32, 13.20],
    zoom: 12.0,
    pitch: 48,
    description: "OMR IT Expressway, Sriperumbudur Auto Hub & Pallikaranai Marsh",
  },
  {
    name: "Kolkata & New Town",
    region: "West Bengal, India",
    coords: [88.3639, 22.5726],
    bbox: [88.22, 22.42, 88.52, 22.70],
    zoom: 12.0,
    pitch: 50,
    description: "New Town Smart Action Areas, Salt Lake Sector V & Ramsar Wetlands",
  },
  {
    name: "Pune & Hinjawadi SEZ",
    region: "Maharashtra, India",
    coords: [73.8567, 18.5204],
    bbox: [73.72, 18.42, 73.98, 18.64],
    zoom: 12.2,
    pitch: 50,
    description: "Hinjawadi IT Park, Chakan Auto Cluster & Magarpatta Township",
  },
  {
    name: "Sundarbans Mangrove Delta",
    region: "West Bengal, India",
    coords: [88.8535, 21.9497],
    bbox: [88.65, 21.80, 89.05, 22.10],
    zoom: 11.2,
    pitch: 45,
    description: "Tidal mangrove biomes, sediment dynamics & cyclone buffers",
  },
  {
    name: "Jaisalmer Thar Desert",
    region: "Rajasthan, India",
    coords: [70.9167, 26.9157],
    bbox: [70.75, 26.80, 71.05, 27.05],
    zoom: 11.8,
    pitch: 48,
    description: "Bhadla Solar Park perimeter & hyper-arid sand dune ridges",
  },
  {
    name: "Kochi Port & Vembanad",
    region: "Kerala, India",
    coords: [76.2673, 9.9312],
    bbox: [76.18, 9.85, 76.35, 10.02],
    zoom: 12.2,
    pitch: 50,
    description: "Deepwater container terminals & Vembanad backwater lagoons",
  },
  {
    name: "Ladakh Cold Desert (Leh)",
    region: "Ladakh, India",
    coords: [77.5771, 34.1526],
    bbox: [77.45, 34.05, 77.70, 34.25],
    zoom: 11.8,
    pitch: 58,
    description: "Trans-Himalayan glaciated valley & Indus River agricultural oasis",
  },
];

const LAYER_CONFIGS: Record<SensorLayer, { name: string; url: string; maxZoom: number; desc: string }> = {
  optical: {
    name: "Optical RGB (Sentinel-2)",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    maxZoom: 18,
    desc: "10 m Copernicus Sentinel-2 MSI Surface Reflectance",
  },
  sar: {
    name: "SAR Radar (Sentinel-1)",
    url: "https://services.arcgisonline.com/arcgis/rest/services/Polar/ArcticOceanBase/MapServer/tile/{z}/{y}/{x}",
    maxZoom: 16,
    desc: "C-Band Synthetic Aperture Radar Microwave Backscatter (VV/VH)",
  },
  ndvi: {
    name: "NDVI / False Color Infrared",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/USA_Topo_Maps/MapServer/tile/{z}/{y}/{x}",
    maxZoom: 15,
    desc: "Multispectral NIR Differential Vegetation Index",
  },
  night: {
    name: "Night Radiance (VIIRS)",
    url: "https://map1.vis.earthdata.nasa.gov/wmts-webmerc/VIIRS_CityLights_2012/default/GoogleMapsCompatible_Level8/{z}/{y}/{x}.jpg",
    maxZoom: 8,
    desc: "NASA Suomi-NPP VIIRS Day/Night Band Thermal Radiance",
  },
  tactical: {
    name: "Dark Infrastructure Grid",
    url: "https://basemaps.cartocdn.com/dark_all/{z}/{y}/{x}@2x.png",
    maxZoom: 19,
    desc: "High-contrast infrastructure vectors & spatial grid",
  },
};

interface GodsEyeGlobeProps {
  bbox: number[] | null;
  onBboxChange: (bbox: number[]) => void;
  activeLayer: SensorLayer;
  onLayerChange: (layer: SensorLayer) => void;
  selectedPreset?: TargetPreset | null;
  onSelectPreset?: (preset: TargetPreset) => void;
  isScanning?: boolean;
  flyToTarget?: [number, number] | null;
  onMapClick?: (coords: [number, number]) => void;
  detectedFeatures?: DetectedFeaturePoint[];
  selectedFeaturePoint?: DetectedFeaturePoint | null;
  onSelectFeaturePoint?: (point: DetectedFeaturePoint | null) => void;
  onAskAboutPoint?: (query: string) => void;
}

export function GodsEyeGlobe({
  bbox,
  onBboxChange,
  activeLayer,
  onLayerChange,
  selectedPreset,
  onSelectPreset,
  isScanning = false,
  flyToTarget,
  onMapClick,
  detectedFeatures = [],
  selectedFeaturePoint = null,
  onSelectFeaturePoint,
  onAskAboutPoint,
}: GodsEyeGlobeProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markerRef = useRef<maplibregl.Marker | null>(null);
  const featureMarkersRef = useRef<maplibregl.Marker[]>([]);
  const isDraggingAoi = useRef(false);
  const aoiStartPoint = useRef<[number, number] | null>(null);
  const animFrameRef = useRef<number | null>(null);

  const [telemetry, setTelemetry] = useState({
    lat: 23.0225,
    lng: 72.5714,
    zoom: 4.5,
    pitch: 45,
    bearing: 0,
    cursorLat: 23.0225,
    cursorLng: 72.5714,
  });

  const [autoRotate, setAutoRotate] = useState(false);
  const [satPassIndex, setSatPassIndex] = useState(0);
  const [showFeaturesLayer, setShowFeaturesLayer] = useState(true);
  const [isBoxSelectMode, setIsBoxSelectMode] = useState(false);
  const isBoxSelectModeRef = useRef(false);

  useEffect(() => {
    isBoxSelectModeRef.current = isBoxSelectMode;
    const map = mapRef.current;
    if (map) {
      map.getCanvas().style.cursor = isBoxSelectMode ? "crosshair" : "";
    }
  }, [isBoxSelectMode]);

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const initialPreset = selectedPreset ?? TARGET_PRESETS[0];

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: {
        version: 8,
        sources: {
          "satellite-tiles": {
            type: "raster",
            tiles: [LAYER_CONFIGS.optical.url],
            tileSize: 256,
            maxzoom: LAYER_CONFIGS.optical.maxZoom,
          },
        },
        layers: [
          {
            id: "satellite-layer",
            type: "raster",
            source: "satellite-tiles",
            paint: {
              "raster-opacity": 1.0,
              "raster-fade-duration": 300,
            },
          },
        ],
        sky: {
          "sky-color": "#01030a",
          "sky-horizon-blend": 0.6,
          "horizon-color": "#0a254d",
          "horizon-fog-blend": 0.8,
          "fog-color": "#010814",
          "fog-ground-blend": 0.7,
        },
      },
      center: [72.5714, 23.0225],
      zoom: 14.2,
      pitch: 68,
      bearing: -30,
      maxPitch: 85,
      renderWorldCopies: true,
    });

    mapRef.current = map;

    map.on("load", () => {
      try {
        if (typeof (map as any).setProjection === "function") {
          (map as any).setProjection({ type: "globe" });
        }
      } catch {
        // mercator fallback
      }

      // Smooth cinematic zoom-out sequence pulling back into orbit
      setTimeout(() => {
        if (!mapRef.current) return;
        map.flyTo({
          center: [78.5, 21.8],
          zoom: 4.6,
          pitch: 45,
          bearing: 0,
          speed: 0.55,
          curve: 1.8,
          duration: 3800,
          essential: true,
        });
      }, 350);

      map.addSource("aoi-box", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });

      map.addLayer({
        id: "aoi-fill",
        type: "fill",
        source: "aoi-box",
        paint: {
          "fill-color": "#2f7bf0",
          "fill-opacity": 0.16,
        },
      });

      map.addLayer({
        id: "aoi-line",
        type: "line",
        source: "aoi-box",
        paint: {
          "line-color": "#7fb2ff",
          "line-width": 2,
        },
      });

      map.addSource("sat-orbits", {
        type: "geojson",
        data: generateOrbitalPaths(),
      });

      map.addLayer({
        id: "sat-orbit-lines",
        type: "line",
        source: "sat-orbits",
        paint: {
          "line-color": "#2f7bf0",
          "line-width": 1.5,
          "line-opacity": 0.35,
          "line-dasharray": [4, 4],
        },
      });

      if (bbox) updateAoiLayer(bbox);
    });

    // Click anywhere on globe to point, pin and inspect
    map.on("click", (e) => {
      if (isDraggingAoi.current) return;
      const coords: [number, number] = [
        Number(e.lngLat.lng.toFixed(5)),
        Number(e.lngLat.lat.toFixed(5)),
      ];

      if (markerRef.current) {
        markerRef.current.remove();
      }

      const el = document.createElement("div");
      el.className = "geospatial-target-marker cursor-pointer";
      el.innerHTML = `
        <div style="position: relative; display: flex; align-items: center; justify-content: center; width: 36px; height: 36px;">
          <div style="position: absolute; inset: -4px; border-radius: 9999px; background: rgba(47, 123, 240, 0.4); animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
          <div style="position: relative; width: 22px; height: 22px; border-radius: 9999px; background: #2f7bf0; border: 2.5px solid #ffffff; box-shadow: 0 0 16px #00f3ff; display: flex; align-items: center; justify-content: center;">
            <div style="width: 7px; height: 7px; border-radius: 9999px; background: #ffffff;"></div>
          </div>
        </div>
      `;

      markerRef.current = new maplibregl.Marker({ element: el })
        .setLngLat(coords)
        .addTo(map);

      onMapClick?.(coords);
    });

    map.on("move", () => {
      const center = map.getCenter();
      setTelemetry((prev) => ({
        ...prev,
        lat: Number(center.lat.toFixed(5)),
        lng: Number(center.lng.toFixed(5)),
        zoom: Number(map.getZoom().toFixed(2)),
        pitch: Number(map.getPitch().toFixed(1)),
        bearing: Number(map.getBearing().toFixed(1)),
      }));
    });

    map.on("mousemove", (e) => {
      setTelemetry((prev) => ({
        ...prev,
        cursorLat: Number(e.lngLat.lat.toFixed(5)),
        cursorLng: Number(e.lngLat.lng.toFixed(5)),
      }));

      if (isDraggingAoi.current && aoiStartPoint.current) {
        const [w0, s0] = aoiStartPoint.current;
        const w1 = e.lngLat.lng;
        const s1 = e.lngLat.lat;
        const west = Math.min(w0, w1);
        const south = Math.min(s0, s1);
        const east = Math.max(w0, w1);
        const north = Math.max(s0, s1);

        const currentBbox = [
          Number(west.toFixed(5)),
          Number(south.toFixed(5)),
          Number(east.toFixed(5)),
          Number(north.toFixed(5)),
        ];

        updateAoiLayer(currentBbox);
      }
    });

    map.on("mousedown", (e) => {
      if (isBoxSelectModeRef.current || e.originalEvent.shiftKey) {
        map.dragPan.disable();
        isDraggingAoi.current = true;
        aoiStartPoint.current = [e.lngLat.lng, e.lngLat.lat];
      }
    });

    map.on("mouseup", (e) => {
      if (isDraggingAoi.current && aoiStartPoint.current) {
        map.dragPan.enable();
        isDraggingAoi.current = false;
        const [w0, s0] = aoiStartPoint.current;
        const w1 = e.lngLat.lng;
        const s1 = e.lngLat.lat;
        const west = Math.min(w0, w1);
        const south = Math.min(s0, s1);
        const east = Math.max(w0, w1);
        const north = Math.max(s0, s1);

        if (Math.abs(east - west) > 0.003 && Math.abs(north - south) > 0.003) {
          const finalBbox = [
            Number(west.toFixed(5)),
            Number(south.toFixed(5)),
            Number(east.toFixed(5)),
            Number(north.toFixed(5)),
          ];
          onBboxChange(finalBbox);
          updateAoiLayer(finalBbox);
        }
        aoiStartPoint.current = null;
        if (isBoxSelectModeRef.current) {
          setIsBoxSelectMode(false);
        }
      }
    });

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      map.remove();
      mapRef.current = null;
    };
  }, []);

  const updateAoiLayer = (b: number[]) => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;

    const source = map.getSource("aoi-box") as GeoJSONSource;
    if (!source) return;

    const [west, south, east, north] = b;
    const polygon = {
      type: "FeatureCollection" as const,
      features: [
        {
          type: "Feature" as const,
          properties: {},
          geometry: {
            type: "Polygon" as const,
            coordinates: [
              [
                [west, south],
                [east, south],
                [east, north],
                [west, north],
                [west, south],
              ],
            ],
          },
        },
      ],
    };
    source.setData(polygon);
  };

  useEffect(() => {
    if (bbox) updateAoiLayer(bbox);
  }, [bbox]);

  // Render on-map detected feature points (hotspots, developments, alerts)
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Clear existing feature markers
    featureMarkersRef.current.forEach((m) => m.remove());
    featureMarkersRef.current = [];

    if (!showFeaturesLayer || detectedFeatures.length === 0) return;

    detectedFeatures.forEach((feat) => {
      const el = document.createElement("div");
      el.className = "detected-spatial-feature-marker cursor-pointer group";

      let color = "#f59e0b"; // amber for built-up
      let badge = "DEV";
      if (feat.category === "vegetation_loss") {
        color = "#ef4444";
        badge = "ALERT";
      } else if (feat.category === "vegetation_gain") {
        color = "#10b981";
        badge = "VEG";
      } else if (feat.category === "water") {
        color = "#00f3ff";
        badge = "H2O";
      } else if (feat.category === "farmland") {
        color = "#eab308";
        badge = "AGRI";
      }

      el.innerHTML = `
        <div style="position: relative; display: flex; flex-direction: column; align-items: center;">
          <div style="background: rgba(0,0,0,0.85); color: #fff; font-family: monospace; font-size: 9px; padding: 2px 6px; border-radius: 4px; border: 1px solid ${color}; white-space: nowrap; margin-bottom: 2px; box-shadow: 0 4px 12px rgba(0,0,0,0.5);">
            <strong style="color: ${color}">${badge}</strong> ${feat.name.split(" ")[0]}
          </div>
          <div style="position: relative; width: 18px; height: 18px; border-radius: 9999px; background: ${color}; border: 2px solid #fff; box-shadow: 0 0 12px ${color}; display: flex; align-items: center; justify-content: center;">
            <div style="width: 5px; height: 5px; border-radius: 9999px; background: #fff;"></div>
          </div>
        </div>
      `;

      el.addEventListener("click", (ev) => {
        ev.stopPropagation();
        onSelectFeaturePoint?.(feat);
      });

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat(feat.coords)
        .addTo(map);

      featureMarkersRef.current.push(marker);
    });
  }, [detectedFeatures, showFeaturesLayer]);

  // Sync flyToTarget
  useEffect(() => {
    if (!flyToTarget) return;
    const map = mapRef.current;
    if (map) {
      if (markerRef.current) {
        markerRef.current.remove();
        markerRef.current = null;
      }

      const el = document.createElement("div");
      el.className = "geospatial-target-marker cursor-pointer";
      el.innerHTML = `
        <div style="position: relative; display: flex; align-items: center; justify-content: center; width: 36px; height: 36px;">
