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
            SHIFT + DRAG TO DRAW AN AOI
          </span>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {REGIONS.map((r) => (
          <button
            key={r.key}
            type="button"
            onClick={() => goto(r.lat, r.lon)}
            title={`${r.state} · ${r.zone}`}
            className="mono rounded-full border border-[var(--color-line)] px-2.5 py-1 text-[10.5px] tracking-[0.08em] text-[var(--color-mute)] transition-colors hover:border-white/25 hover:text-white"
          >
            {r.name.toUpperCase()}
          </button>
        ))}
      </div>

      <label className="mt-3 block">
        <span className="mono text-[10px] tracking-[0.14em] text-[var(--color-mute)]">
          BBOX — WEST, SOUTH, EAST, NORTH
        </span>
        <input
          value={bbox ? bbox.join(", ") : ""}
          onChange={(e) => {
            const v = e.target.value.split(",").map((x) => Number(x.trim()));
            if (v.length === 4 && v.every((n) => Number.isFinite(n))) {
              onChange(v);
              const L = window.L;
              if (L && map.current) {
                const b = L.latLngBounds([v[1], v[0]], [v[3], v[2]]);
                (map.current as any).__draw(b);
                map.current.fitBounds(b);
              }
            }
          }}
          placeholder="72.56, 23.01, 72.60, 23.05"
          className="mono mt-1.5 w-full rounded-md border border-[var(--color-line)] bg-white/[0.03] px-3 py-2 text-[12px] text-white outline-none placeholder:text-white/25 focus:border-[var(--color-brand)]"
        />
      </label>
    </div>
  );
}
