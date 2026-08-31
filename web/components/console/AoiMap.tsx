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
