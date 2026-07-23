"use client";

import { useEffect, useRef, useState } from "react";
import { NAV } from "@/lib/content";

/* ------------------------------------------------------------------ nav */
export function Nav() {
  const [solid, setSolid] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setSolid(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-colors duration-300 ${
        solid
          ? "border-b border-[var(--color-line)] bg-black/72 backdrop-blur-xl"
          : "border-b border-transparent"
      }`}
    >
      <nav className="mx-auto flex h-[60px] max-w-[1240px] items-center justify-between px-5 sm:px-8">
        <a href="/" className="flex items-center gap-2.5" aria-label="SatQuery AI, home">
          <Mark />
          <span className="mono text-[12.5px] font-medium tracking-[0.2em] text-white">
            SATQUERY
          </span>
        </a>

        <div className="hidden items-center gap-8 md:flex">
          {NAV.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="text-[13.5px] text-[var(--color-dim)] transition-colors hover:text-white"
            >
              {l.label}
            </a>
          ))}
          <a
            href="/console"
            className="rounded-full bg-[var(--color-brand)] px-4 py-[7px] text-[13px] font-medium text-white transition-colors hover:bg-[#4b8ef5]"
          >
            Console
          </a>
        </div>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-label="Toggle navigation"
          className="grid h-9 w-9 place-items-center rounded-md border border-[var(--color-line)] md:hidden"
        >
          <span className="relative block h-[9px] w-[15px]">
            <span className="absolute inset-x-0 top-0 h-px bg-white" />
            <span className="absolute inset-x-0 bottom-0 h-px bg-white" />
          </span>
        </button>
      </nav>

      {open && (
        <div className="border-t border-[var(--color-line)] bg-black/95 px-5 py-4 md:hidden">
          {NAV.map((l) => (
            <a
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className="block py-2.5 text-[15px] text-[var(--color-dim)]"
            >
              {l.label}
            </a>
          ))}
          <a href="/console" className="block py-2.5 text-[15px] text-[var(--color-brand-soft)]">
            Console
          </a>
        </div>
      )}
    </header>
  );
}

function Mark() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="7.2" stroke="white" strokeWidth="1.5" />
      <ellipse
        cx="12"
        cy="12"
        rx="11"
        ry="4.2"
        stroke="var(--color-brand)"
        strokeWidth="1.5"
        transform="rotate(-28 12 12)"
      />
    </svg>
  );
}

/* ----------------------------------------------------------- starfield */
export function Starfield() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;

    // Drawn once to a canvas rather than rendered as hundreds of DOM nodes:
    // the same field costs one element and no layout work on scroll.
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let stars: { x: number; y: number; r: number; a: number }[] = [];

    const draw = () => {
      const w = window.innerWidth;
      const h = Math.max(window.innerHeight, 700);
      cv.width = w * dpr;
      cv.height = h * dpr;
      cv.style.width = `${w}px`;
      cv.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);

      const n = Math.round((w * h) / 3400);
      stars = Array.from({ length: n }, () => ({
        x: Math.random() * w,
        // bias upward: the lower half of the hero is the planet, and stars
        // drawn there would sit "inside" it
        y: Math.pow(Math.random(), 1.5) * h,
        r: Math.random() * 1.15 + 0.25,
        a: Math.random() * 0.72 + 0.16,
      }));

      for (const s of stars) {
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${s.a})`;
        ctx.fill();
      }
    };

    draw();
    let t: ReturnType<typeof setTimeout>;
    const onResize = () => {
      clearTimeout(t);
      t = setTimeout(draw, 180);
    };
    window.addEventListener("resize", onResize);
    return () => {
      clearTimeout(t);
      window.removeEventListener("resize", onResize);
