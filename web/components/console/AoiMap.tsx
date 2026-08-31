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
          if (box.current) m.removeLayer(box.current);
          box.current = L.rectangle(b, {
            color: "#2f7bf0",
            weight: 2,
            fillOpacity: 0.12,
          }).addTo(m);
        };

        m.on("mousedown", (e: any) => {
          if (!e.originalEvent.shiftKey) return;
          m.dragging.disable();
          start.current = e.latlng;
        });
        m.on("mousemove", (e: any) => {
          if (!start.current) return;
          const b = L.latLngBounds(start.current, e.latlng);
          if (ghost.current) ghost.current.setBounds(b);
          else
            ghost.current = L.rectangle(b, {
              color: "#7fb2ff",
              weight: 1,
              dashArray: "4",
              fillOpacity: 0.06,
            }).addTo(m);
        });
        m.on("mouseup", (e: any) => {
          if (!start.current) return;
          const b = L.latLngBounds(start.current, e.latlng);
          start.current = null;
          m.dragging.enable();
          if (ghost.current) {
            m.removeLayer(ghost.current);
            ghost.current = null;
          }
          draw(b);
          const sw = b.getSouthWest();
          const ne = b.getNorthEast();
          cb.current([+sw.lng.toFixed(5), +sw.lat.toFixed(5), +ne.lng.toFixed(5), +ne.lat.toFixed(5)]);
        });

        (m as any).__draw = draw;
        setReady(true);
      })
      .catch((e) => setError(e.message));

    return () => {
      dead = true;
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, []);

  /** Centre on a preset region and drop a ~4 km box on it. */
  const goto = (lat: number, lon: number) => {
    const L = window.L;
    const m = map.current;
    if (!L || !m) return;
    const d = 0.02; // ~4.4 km at this latitude — comfortably inside the fetch cap
    const b = L.latLngBounds([lat - d, lon - d], [lat + d, lon + d]);
    m.setView([lat, lon], 13);
    (m as any).__draw(b);
    cb.current([+(lon - d).toFixed(5), +(lat - d).toFixed(5), +(lon + d).toFixed(5), +(lat + d).toFixed(5)]);
  };

  return (
    <div>
      <div className="relative overflow-hidden rounded-lg border border-[var(--color-line)]">
        <div ref={holder} className="h-[300px] w-full bg-[#0b0e13]" />
        {!ready && !error && (
          <div className="absolute inset-0 grid place-items-center bg-[#0b0e13]">
            <span className="mono text-[11px] tracking-[0.14em] text-[var(--color-mute)]">
              LOADING MAP…
            </span>
          </div>
        )}
        {error && (
          <div className="absolute inset-0 grid place-items-center bg-[#0b0e13] px-6 text-center">
            <span className="text-[12.5px] text-[var(--color-signal)]">
              Map unavailable ({error}). Type a bounding box below instead.
            </span>
          </div>
        )}
        <div className="pointer-events-none absolute bottom-2 left-2 z-[400] rounded bg-black/70 px-2.5 py-1">
          <span className="mono text-[10px] tracking-[0.1em] text-[var(--color-mute)]">
