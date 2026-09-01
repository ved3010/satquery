"use client";

import { api, type Analysis, type Trace } from "@/lib/api";

const CLASS_ORDER = ["water", "vegetation", "sparse vegetation", "built-up", "bare/other"];

const TONE: Record<string, string> = {
  water: "var(--color-ice)",
  vegetation: "var(--color-verd)",
  "sparse vegetation": "#8fd6a8",
  "built-up": "var(--color-signal)",
  "bare/other": "rgba(255,255,255,0.42)",
};

const n2 = (x: number) => (x >= 0 ? "+" : "") + x.toFixed(2);

/* ------------------------------------------------------- headline tiles */
function Tiles({ a }: { a: Analysis }) {
  if (!a.available) return null;

  const tiles =
    a.mode === "single"
      ? [
          { label: "VEGETATION", v: `${a.scene?.cover.vegetation.pct.toFixed(2)}%`, note: `${a.scene?.cover.vegetation.km2.toFixed(2)} km²`, tone: TONE.vegetation },
          { label: "BUILT-UP", v: `${a.scene?.cover["built-up"].pct.toFixed(2)}%`, note: `${a.scene?.cover["built-up"].km2.toFixed(2)} km²`, tone: TONE["built-up"] },
          { label: "WATER", v: `${a.scene?.cover.water.pct.toFixed(2)}%`, note: `${a.scene?.cover.water.km2.toFixed(2)} km²`, tone: TONE.water },
        ]
      : [
          { label: "VEGETATION", v: `${n2(a.change!.classes.vegetation.delta_pp)} pp`, note: `${a.change!.classes.vegetation.t1_pct.toFixed(2)}% → ${a.change!.classes.vegetation.t2_pct.toFixed(2)}%`, tone: TONE.vegetation },
          { label: "URBANISATION", v: `${n2(a.change!.classes["built-up"].delta_pp)} pp`, note: `${a.change!.new_built_up.km2.toFixed(3)} km² newly built-up`, tone: TONE["built-up"] },
          { label: "WATER", v: `${n2(a.change!.classes.water.delta_pp)} pp`, note: `${a.change!.classes.water.t1_pct.toFixed(2)}% → ${a.change!.classes.water.t2_pct.toFixed(2)}%`, tone: TONE.water },
        ];

  return (
    <div className="grid gap-px overflow-hidden rounded-lg border border-[var(--color-line)] bg-[var(--color-line)] sm:grid-cols-3">
      {tiles.map((t) => (
        <div key={t.label} className="bg-black px-5 py-5">
          <p className="mono text-[10px] tracking-[0.16em]" style={{ color: t.tone }}>
            {t.label}
          </p>
          <p className="mt-2 text-[25px] font-medium tabular-nums tracking-tight text-white">{t.v}</p>
          <p className="mono mt-1 text-[10.5px] text-[var(--color-mute)]">{t.note}</p>
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------- measured table */
function Measured({ a }: { a: Analysis }) {
  if (!a.available) {
    return (
      <div className="panel rounded-lg p-5">
        <p className="mono text-[10.5px] tracking-[0.14em] text-[var(--color-signal)]">
          NOT COMPUTABLE
        </p>
