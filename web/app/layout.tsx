import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SatQuery AI — Ask Earth. Get an auditable answer.",
  description:
    "An agentic vision-language assistant for multimodal remote sensing. Optical, SAR and bi-temporal satellite imagery, interrogated in plain language and answered with measured evidence and a full execution trace. SIH 2026 · PS 26167 · ISRO/SAC.",
  keywords: [
    "remote sensing",
    "vision-language model",
    "SAR",
    "change detection",
    "Earth observation",
    "agentic AI",
    "Sentinel-2",
  ],
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#000000",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[999] focus:rounded-full focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:text-black"
        >
          Skip to main content
        </a>
        {children}
      </body>
    </html>
  );
}
