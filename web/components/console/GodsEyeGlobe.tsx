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
          <div style="position: absolute; inset: -4px; border-radius: 9999px; background: rgba(47, 123, 240, 0.4); animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
          <div style="position: relative; width: 22px; height: 22px; border-radius: 9999px; background: #2f7bf0; border: 2.5px solid #ffffff; box-shadow: 0 0 16px #00f3ff; display: flex; align-items: center; justify-content: center;">
            <div style="width: 7px; height: 7px; border-radius: 9999px; background: #ffffff;"></div>
          </div>
        </div>
      `;

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat(flyToTarget)
        .addTo(map);

      markerRef.current = marker;

      map.flyTo({
        center: flyToTarget,
        zoom: 12.2,
        pitch: 52,
        bearing: Math.floor(Math.random() * 30) - 15,
        speed: 1.3,
        curve: 1.3,
        essential: true,
      });
    }
  }, [flyToTarget]);

  // Switch sensor layers
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;

    const config = LAYER_CONFIGS[activeLayer];
    const source = map.getSource("satellite-tiles") as any;

    if (source && source.setTiles) {
      source.setTiles([config.url]);
    } else if (map.getLayer("satellite-layer")) {
      map.removeLayer("satellite-layer");
      if (map.getSource("satellite-tiles")) map.removeSource("satellite-tiles");

      map.addSource("satellite-tiles", {
        type: "raster",
        tiles: [config.url],
        tileSize: 256,
        maxzoom: config.maxZoom,
      });

      map.addLayer(
        {
          id: "satellite-layer",
          type: "raster",
          source: "satellite-tiles",
          paint: { "raster-opacity": 1.0, "raster-fade-duration": 300 },
        },
        "aoi-fill"
      );
    }
  }, [activeLayer]);

  const handleFlyToPreset = (preset: TargetPreset) => {
    onSelectPreset?.(preset);
    onBboxChange(preset.bbox);
    updateAoiLayer(preset.bbox);

    const map = mapRef.current;
    if (map) {
      map.flyTo({
        center: preset.coords,
        zoom: preset.zoom,
        pitch: preset.pitch,
        bearing: Math.floor(Math.random() * 40) - 20,
        speed: 1.4,
        curve: 1.2,
        essential: true,
      });
    }
  };

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    let isRunning = autoRotate;

    const rotate = () => {
      if (!isRunning || !map) return;
      const currentBearing = map.getBearing();
      map.setBearing(currentBearing + 0.12);
      animFrameRef.current = requestAnimationFrame(rotate);
    };

    if (autoRotate) {
      rotate();
    } else if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
    }

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [autoRotate]);

  useEffect(() => {
    const timer = setInterval(() => {
      setSatPassIndex((prev) => (prev + 1) % 4);
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  const SATELLITE_ORBITS = [
    { name: "Sentinel-2A (Optical)", alt: "786 km", status: "Acquiring" },
    { name: "Sentinel-1A (SAR Radar)", alt: "693 km", status: "Active" },
    { name: "Sentinel-2B (Optical)", alt: "786 km", status: "Standby" },
    { name: "ISRO Cartosat-3", alt: "505 km", status: "Pointed" },
  ];

  const currentSat = SATELLITE_ORBITS[satPassIndex];

  const triggerCinematicZoomOut = () => {
    const map = mapRef.current;
    if (!map) return;
    map.flyTo({
      center: [78.5, 21.8],
      zoom: 4.4,
      pitch: 45,
      bearing: 0,
      speed: 0.55,
      curve: 1.8,
      duration: 3500,
      essential: true,
    });
  };

  return (
    <div className="relative w-full h-full min-h-[520px] overflow-hidden select-none bg-black rounded-xl border border-[var(--color-line)]">
      {/* 3D WebGL Globe Container */}
      <div ref={mapContainerRef} className="absolute inset-0 w-full h-full cursor-crosshair z-0" />

      {/* Interactive Point Inspector HUD Card on the Map */}
      {selectedFeaturePoint && (
        <PointInspectorHud
          point={selectedFeaturePoint}
          onClose={() => onSelectFeaturePoint?.(null)}
          onAskAboutPoint={onAskAboutPoint}
        />
      )}

      {/* Scanning Indicator & Laser Sweep */}
      {isScanning && (
        <div className="absolute inset-0 pointer-events-none z-20 flex items-center justify-center bg-black/40 backdrop-blur-xs overflow-hidden">
          <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-[var(--color-brand-soft)] to-transparent shadow-[0_0_15px_#2f7bf0] animate-laser-scan" />
          <div className="flex flex-col items-center gap-3">
            <div className="w-12 h-12 rounded-full border-2 border-t-[var(--color-brand)] border-white/20 animate-spin" />
            <span className="mono text-[11px] tracking-[0.18em] text-[var(--color-brand-soft)] uppercase animate-pulse">
              Acquiring Copernicus Sentinel-1 & 2 Imagery...
            </span>
          </div>
        </div>
      )}

      {/* Top Overlay: Satellite Status & Telemetry */}
      <div className="absolute top-3 inset-x-3 z-20 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
        <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-[var(--color-line)] bg-black/80 backdrop-blur-md pointer-events-auto transition-all hover:border-white/20">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--color-brand)] opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--color-brand)]" />
          </span>
          <Satellite className="w-3.5 h-3.5 text-[var(--color-brand-soft)]" />
          <span className="mono text-[10.5px] font-medium text-white">{currentSat.name}</span>
          <span className="text-[var(--color-line)]">|</span>
          <span className="mono text-[10px] text-[var(--color-mute)]">{currentSat.alt}</span>
          <span className="mono text-[10px] text-[var(--color-verd)]">{currentSat.status}</span>
        </div>

        <div className="flex items-center gap-3 px-3 py-1.5 rounded-full border border-[var(--color-line)] bg-black/75 backdrop-blur-md pointer-events-auto mono text-[10.5px] text-[var(--color-mute)]">
          <span>{telemetry.cursorLat}° N, {telemetry.cursorLng}° E</span>
          <span className="text-[var(--color-line)]">|</span>
          <span>Zoom: {telemetry.zoom}</span>
          <span className="text-[var(--color-line)]">|</span>
          <span>Pitch: {telemetry.pitch}°</span>
        </div>

        <div className="flex items-center gap-1.5 pointer-events-auto">
          {detectedFeatures.length > 0 && (
            <button
              onClick={() => setShowFeaturesLayer(!showFeaturesLayer)}
              className={`px-3 py-1.5 rounded-full border text-[11px] mono transition flex items-center gap-1.5 ${
                showFeaturesLayer
                  ? "bg-amber-500/20 border-amber-500/50 text-amber-300 font-medium"
                  : "border-[var(--color-line)] bg-black/75 text-[var(--color-mute)]"
              }`}
              title="Toggle On-Map Detected Feature Points"
            >
              <Activity className="w-3 h-3" />
              <span>Features ({detectedFeatures.length})</span>
            </button>
          )}

          <button
            onClick={() => setIsBoxSelectMode(!isBoxSelectMode)}
            className={`px-3 py-1.5 rounded-full border text-[11px] mono transition flex items-center gap-1.5 ${
              isBoxSelectMode
                ? "bg-[var(--color-brand)] border-[var(--color-brand)] text-white font-medium shadow-[0_0_15px_rgba(47,123,240,0.5)]"
                : "border-[var(--color-line)] bg-black/75 text-[var(--color-mute)] hover:text-white hover:border-white/20"
            }`}
            title="Click and drag anywhere on the globe to draw a custom bounding box"
          >
            <Crop className="w-3 h-3 text-[var(--color-brand-soft)]" />
            <span>{isBoxSelectMode ? "Drawing Active..." : "Select Area (Draw Box)"}</span>
          </button>

          <button
            onClick={triggerCinematicZoomOut}
            className="px-3 py-1.5 rounded-full border border-[var(--color-line)] bg-black/75 text-[11px] mono text-[var(--color-brand-soft)] hover:text-white hover:border-[var(--color-brand)] transition flex items-center gap-1.5"
            title="Cinematic Zoom-Out to Full Earth Orbit"
          >
            <Compass className="w-3 h-3" />
            <span>Cinematic Orbit</span>
          </button>
          <button
            onClick={() => setAutoRotate(!autoRotate)}
            className={`px-3 py-1.5 rounded-full border text-[11px] mono transition flex items-center gap-1.5 ${
              autoRotate
                ? "bg-[var(--color-brand)] border-[var(--color-brand)] text-white"
                : "border-[var(--color-line)] bg-black/75 text-[var(--color-mute)] hover:text-white"
            }`}
          >
            {autoRotate ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
            <span>Rotate</span>
          </button>
          <button
            onClick={() => mapRef.current?.zoomIn()}
            className="p-1.5 rounded-full border border-[var(--color-line)] bg-black/75 text-[var(--color-mute)] hover:text-white transition"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => mapRef.current?.zoomOut()}
            className="p-1.5 rounded-full border border-[var(--color-line)] bg-black/75 text-[var(--color-mute)] hover:text-white transition"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Left Sensor Matrix Selector */}
      <div className="absolute left-3 top-16 z-20 pointer-events-auto flex flex-col gap-1.5 max-w-[210px]">
        <div className="p-2.5 rounded-xl border border-[var(--color-line)] bg-black/80 backdrop-blur-md space-y-1.5">
          <div className="mono text-[10px] tracking-[0.16em] text-[var(--color-mute)] uppercase px-1">
            Sensor Matrix
          </div>
          {(Object.keys(LAYER_CONFIGS) as SensorLayer[]).map((layer) => {
            const cfg = LAYER_CONFIGS[layer];
            const isSelected = activeLayer === layer;
            return (
              <button
                key={layer}
                onClick={() => onLayerChange(layer)}
                className={`w-full text-left px-2.5 py-1.5 rounded-lg text-[11px] transition flex items-center justify-between border ${
                  isSelected
                    ? "bg-[var(--color-brand)]/20 border-[var(--color-brand)] text-white font-medium"
                    : "border-transparent text-[var(--color-mute)] hover:text-white hover:bg-white/5"
                }`}
              >
                <span className="truncate">{cfg.name}</span>
                {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-brand)]" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Bottom Hint */}
      <div className="absolute bottom-3 left-3 z-20 pointer-events-none">
        <div className="px-3 py-1.5 rounded-full border border-[var(--color-line)] bg-black/75 backdrop-blur-md mono text-[10px] text-[var(--color-mute)] flex items-center gap-2">
          <span className="text-white">Click any point</span>
          <span>to pin & acquire · Click &quot;Select Area (Draw Box)&quot; or Shift+Drag to draw box</span>
          {bbox && (
            <span className="text-[var(--color-verd)]">
              • BBox: [{bbox[0]}, {bbox[1]}, {bbox[2]}, {bbox[3]}]
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function generateOrbitalPaths(): any {
  const features = [];
  const inclinations = [98.5, 98.18, 97.5, 53.0];

  for (let i = 0; i < inclinations.length; i++) {
    const inc = (inclinations[i] * Math.PI) / 180;
    const coords: [number, number][] = [];
    const offsetLng = (i * 90) - 180;

    for (let lng = -180; lng <= 180; lng += 4) {
      const radLng = ((lng - offsetLng) * Math.PI) / 180;
      const lat = Math.asin(Math.sin(inc) * Math.sin(radLng)) * (180 / Math.PI);
      coords.push([lng, lat]);
    }

    features.push({
      type: "Feature",
      properties: { sat_id: `SAT-${i + 1}` },
      geometry: {
        type: "LineString",
        coordinates: coords,
      },
    });
  }

  return {
    type: "FeatureCollection",
    features,
  };
}
