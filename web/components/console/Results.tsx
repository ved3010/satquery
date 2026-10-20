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
        <p className="mt-2 text-[13px] leading-[1.7] text-[var(--color-mute)]">{a.reason}</p>
      </div>
    );
  }

  const single = a.mode === "single";
  const cover = single ? a.scene!.cover : null;
  const ch = a.change;

  return (
    <div className="overflow-hidden rounded-lg border border-[var(--color-line)]">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--color-line)] px-5 py-3">
        <span className="mono text-[10.5px] tracking-[0.14em] text-[var(--color-mute)]">
          MEASURED LAND COVER — NDVI / MNDWI / NDBI
        </span>
        <span className="mono text-[10.5px] text-[var(--color-mute)]">
          {(single ? a.scene?.area_km2 : ch?.area_km2)?.toFixed(3)} km² · {a.gsd_m} m GSD
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[520px] border-collapse">
          <thead>
            <tr className="border-b border-[var(--color-line)]">
              {(single
                ? ["class", "cover %", "area km²"]
                : ["class", `${a.dates?.[0] ?? "t1"} %`, `${a.dates?.[1] ?? "t2"} %`, "Δ pp", "Δ relative"]
              ).map((h, i) => (
                <th
                  key={h}
                  className={`mono px-5 py-2.5 text-[10px] font-normal tracking-[0.12em] text-[var(--color-mute)] ${
                    i === 0 ? "text-left" : "text-right"
                  }`}
                >
                  {h.toUpperCase()}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {CLASS_ORDER.map((c) => {
              const row = single ? cover![c] : null;
              const cr = single ? null : ch!.classes[c];
              return (
                <tr key={c} className="border-b border-[var(--color-line)] last:border-0">
                  <td className="px-5 py-2.5 text-[13px] text-[var(--color-dim)]">
                    <span
                      className="mr-2 inline-block h-2 w-2 rounded-full align-middle"
                      style={{ background: TONE[c] }}
                    />
                    {c}
                  </td>
                  {single ? (
                    <>
                      <td className="px-5 py-2.5 text-right text-[13px] tabular-nums text-white">
                        {row!.pct.toFixed(2)}%
                      </td>
                      <td className="mono px-5 py-2.5 text-right text-[12px] tabular-nums text-[var(--color-mute)]">
                        {row!.km2.toFixed(3)}
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="mono px-5 py-2.5 text-right text-[12px] tabular-nums text-[var(--color-mute)]">
                        {cr!.t1_pct.toFixed(2)}%
                      </td>
                      <td className="px-5 py-2.5 text-right text-[13px] tabular-nums text-white">
                        {cr!.t2_pct.toFixed(2)}%
                      </td>
                      <td
                        className="mono px-5 py-2.5 text-right text-[12px] tabular-nums"
                        style={{ color: cr!.delta_pp === 0 ? "var(--color-mute)" : TONE[c] }}
                      >
                        {n2(cr!.delta_pp)}
                      </td>
                      <td className="mono px-5 py-2.5 text-right text-[12px] tabular-nums text-[var(--color-mute)]">
                        {cr!.relative_pct === null ? "—" : `${cr!.relative_pct > 0 ? "+" : ""}${cr!.relative_pct.toFixed(1)}%`}
                      </td>
                    </>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {ch && (
        <div className="space-y-2 border-t border-[var(--color-line)] px-5 py-4 text-[12.5px] leading-[1.7] text-[var(--color-mute)]">
          <p>
            <span className="text-[var(--color-dim)]">Vegetation.</span> Mean ΔNDVI{" "}
            {n2(ch.vegetation_index_change.mean_dndvi)}. {ch.vegetation_index_change.gain_pct.toFixed(2)}% of
            the area gained vegetation and {ch.vegetation_index_change.loss_pct.toFixed(2)}% lost it.
          </p>
          <p>
            <span className="text-[var(--color-dim)]">Urbanisation.</span> {ch.new_built_up.km2.toFixed(3)} km²
            became built-up that was not before ({ch.new_built_up.pct_of_scene.toFixed(2)}% of the scene)
            {Object.keys(ch.new_built_up.converted_from_pct).length > 0 &&
              `, converted from ${Object.entries(ch.new_built_up.converted_from_pct)
                .map(([k, v]) => `${k} ${v.toFixed(1)}%`)
                .join(", ")}`}
            .
          </p>
          <p>
            <span className="text-[var(--color-dim)]">Water.</span> Mean ΔMNDWI{" "}
            {n2(ch.water_index_change.mean_dmndwi)}; {ch.water_index_change.gain_pct.toFixed(2)}% wetted and{" "}
            {ch.water_index_change.loss_pct.toFixed(2)}% dried. {ch.transitioned_pct.toFixed(2)}% of pixels
            changed class.
          </p>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------- execution trace */
function TraceTable({ t }: { t: Trace }) {
  return (
    <div className="overflow-hidden rounded-lg border border-[var(--color-line)]">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--color-line)] px-5 py-3">
        <span className="mono text-[10.5px] tracking-[0.14em] text-[var(--color-mute)]">
          EXECUTION TRACE — {t.steps.length} STEPS
        </span>
        <span className="mono text-[10.5px] text-[var(--color-mute)]">
          {t.total_ms} ms · {t.input_config} · task {t.task ?? "n/a"}
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[620px] border-collapse">
          <tbody>
            {t.steps.map((s, i) => (
              <tr key={i} className="border-b border-[var(--color-line)] last:border-0 align-top">
                <td className="mono px-5 py-3 text-[11px] text-[var(--color-mute)]">{i + 1}</td>
                <td className="mono px-2 py-3 text-[12px] text-white">
                  {s.node}
                  {s.model_id && (
                    <span className="ml-2 text-[var(--color-brand-soft)]">
                      {s.model_id} {s.model_name}
                    </span>
                  )}
                  {s.error && <span className="ml-2 text-[var(--color-signal)]">⚠ {s.error}</span>}
                </td>
                <td className="mono px-2 py-3 text-[10.5px] leading-[1.7] text-[var(--color-mute)]">
                  {Object.entries(s.params)
                    .map(([k, v]) => `${k}=${String(v)}`)
                    .join(", ") || "—"}
                  {s.outcome && <div className="mt-1 text-[var(--color-dim)]">{s.outcome}</div>}
                </td>
                <td className="mono px-2 py-3 text-right text-[11px] tabular-nums text-[var(--color-mute)]">
                  {s.latency_ms} ms
                </td>
                <td className="mono px-5 py-3 text-right text-[11px] tabular-nums text-[var(--color-mute)]">
                  {s.confidence === null ? "—" : s.confidence.toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- panel */
export function Results({ trace }: { trace: Trace }) {
  if (trace.rejected) {
    return (
      <div className="space-y-5">
        <div className="rounded-lg border border-[var(--color-signal)]/35 bg-[var(--color-signal)]/[0.06] p-6">
          <p className="mono text-[10.5px] tracking-[0.16em] text-[var(--color-signal)]">REFUSED</p>
          <p className="mt-3 text-[15px] leading-[1.65] text-white">{trace.rejected}</p>
          <p className="mt-3 text-[13px] leading-[1.7] text-[var(--color-mute)]">
            Refusing is the correct outcome here, and it is recorded in the trace like any other. PS 26167
            asks for input compatibility checking — returning a confident answer from imagery that cannot
            support one would fail that requirement, not satisfy it.
          </p>
        </div>
        <TraceTable t={trace} />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* answer */}
      <div className="panel rounded-lg p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="mono text-[10.5px] tracking-[0.16em] text-[var(--color-mute)]">ANSWER</span>
          <div className="flex items-center gap-3">
            {trace.confidence !== null && (
              <span className="mono text-[10.5px] text-[var(--color-mute)]">
                confidence {trace.confidence.toFixed(2)}
              </span>
            )}
            <a
              href={api.reportUrl(trace.run_id)}
              download
              className="mono rounded-full border border-[var(--color-line)] px-3 py-[5px] text-[10.5px] tracking-[0.1em] text-[var(--color-dim)] transition-colors hover:border-white/25 hover:text-white"
            >
              ↓ REPORT.MD
            </a>
          </div>
        </div>
        <div className="mt-4 space-y-3">
          {trace.answer.split("\n\n").map((p, i) => (
            <p
              key={i}
              className={`text-[14.5px] leading-[1.72] ${
                p.startsWith("⚠") ? "text-[var(--color-signal)]" : "text-[var(--color-dim)]"
              }`}
            >
              {p}
            </p>
          ))}
        </div>
        <p className="mono mt-5 border-t border-[var(--color-line)] pt-4 text-[10.5px] text-[var(--color-mute)]">
          models invoked: {trace.models_invoked.join(" · ") || "none"} · run {trace.run_id}
        </p>
      </div>

      <Tiles a={trace.analysis} />
      <Measured a={trace.analysis} />
      <TraceTable t={trace} />
    </div>
  );
}
