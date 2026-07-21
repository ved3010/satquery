import { HERO } from "@/lib/content";
import { Starfield } from "./Chrome";

export function Hero({ trained, total }: { trained: number; total: number }) {
  return (
    <section
      id="top"
      className="relative isolate flex min-h-[100svh] flex-col items-center overflow-hidden pt-[60px]"
    >
