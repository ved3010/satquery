"use client";

import { useEffect, useRef, useState } from "react";
import { REGIONS } from "@/lib/api";

/*
  Leaflet is loaded from a CDN at runtime rather than installed.

  react-leaflet would pull Leaflet into the client bundle of a site whose other
  route is a static marketing page — the map would cost every visitor who never
  opens the console. Loading it here, on mount, keeps the landing page at
  104 kB and puts the map's weight on the page that actually draws a map.

  The rectangle is drawn by hand from mouse events instead of with
  leaflet-draw: one dependency fewer, and drag-to-draw is the whole interaction.
*/

type LatLng = { lat: number; lng: number };

declare global {
  interface Window {
    L?: any;
  }
}

const CDN = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4";

function loadLeaflet(): Promise<any> {
  if (typeof window === "undefined") return Promise.reject(new Error("no window"));
  if (window.L) return Promise.resolve(window.L);

  return new Promise((resolve, reject) => {
    if (!document.querySelector('link[data-leaflet]')) {
      const css = document.createElement("link");
      css.rel = "stylesheet";
      css.href = `${CDN}/leaflet.min.css`;
      css.setAttribute("data-leaflet", "1");
      document.head.appendChild(css);
    }
    const existing = document.querySelector<HTMLScriptElement>("script[data-leaflet]");
    if (existing) {
      existing.addEventListener("load", () => resolve(window.L));
      existing.addEventListener("error", () => reject(new Error("leaflet failed to load")));
      return;
    }
    const s = document.createElement("script");
    s.src = `${CDN}/leaflet.min.js`;
    s.setAttribute("data-leaflet", "1");
    s.onload = () => resolve(window.L);
    s.onerror = () => reject(new Error("leaflet failed to load"));
    document.head.appendChild(s);
  });
}

export function AoiMap({
  bbox,
  onChange,
}: {
  bbox: number[] | null;
  onChange: (b: number[]) => void;
}) {
  const holder = useRef<HTMLDivElement>(null);
  const map = useRef<any>(null);
  const box = useRef<any>(null);
  const ghost = useRef<any>(null);
  const start = useRef<LatLng | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cb = useRef(onChange);
  cb.current = onChange;

  useEffect(() => {
    let dead = false;

    loadLeaflet()
      .then((L) => {
        if (dead || !holder.current || map.current) return;
        const m = L.map(holder.current, { zoomControl: true, attributionControl: false })
          .setView([23.03, 72.58], 11);
        L.tileLayer(
          "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
          { maxZoom: 18 },
        ).addTo(m);
        map.current = m;

        const draw = (b: any) => {
