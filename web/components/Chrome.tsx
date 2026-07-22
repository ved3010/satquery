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
