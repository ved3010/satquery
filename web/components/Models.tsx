import data from "@/lib/models.json";
import { Head, Section } from "./Sections";
import { Reveal } from "./Chrome";

type Headline = {
  id: string;
  name: string;
  task: string;
  metric: string;
  value: number | null;
  baseline: number | null;
  baseline_label: string | null;
  n: number | null;
};

const pct = (x: number | null | undefined) =>
  x === null || x === undefined ? "—" : `${(x * 100).toFixed(1)}%`;

export function Models() {
  const rows = data.headline as Headline[];
  const ab = data.cloud_ablation as Record<string, number>;

  return (
    <Section id="models">
      <Head
        kicker="The models"
        title="Eight specialists. Every number measured against a baseline."
        lede="An accuracy with no baseline cannot answer the only question that matters — is the model using the image at all? So the pair travels together everywhere: in the report, in the vault note, and here. These figures are read straight from the training reports, not typed by hand."
      />

      {/* ------------------------------------------------ headline metrics */}
      <div className="mt-16 overflow-hidden rounded-lg border border-[var(--color-line)]">
        <div className="hidden grid-cols-[64px_1fr_150px_86px_1fr] items-center gap-4 border-b border-[var(--color-line)] px-5 py-3 md:grid">
          {["Model", "Task", "Metric", "Result", "Against baseline"].map((h) => (
            <span
              key={h}
              className="mono text-[10.5px] tracking-[0.16em] text-[var(--color-mute)]"
            >
              {h.toUpperCase()}
            </span>
          ))}
        </div>

        {rows.map((r, i) => {
          const v = r.value ?? 0;
          const b = r.baseline;
          return (
            <Reveal key={r.id} delay={i * 45}>
              <div className="grid grid-cols-1 gap-3 border-b border-[var(--color-line)] px-5 py-5 last:border-0 md:grid-cols-[64px_1fr_150px_86px_1fr] md:items-center md:gap-4">
                <span className="mono text-[13px] font-medium text-white">{r.id}</span>

                <span className="text-[14.5px] text-[var(--color-dim)]">
                  {r.task}
                  <span className="mono ml-2 text-[11.5px] text-[var(--color-mute)]">
                    {r.name}
                  </span>
                </span>

                <span className="mono text-[11.5px] text-[var(--color-mute)]">
                  {r.metric}
                </span>

                <span className="text-[17px] font-medium tabular-nums text-white">
                  {pct(r.value)}
                </span>

                <div>
                  <div className="relative h-[5px] w-full overflow-hidden rounded-full bg-white/[0.07]">
                    {b !== null && (
                      <div
                        className="absolute inset-y-0 left-0 rounded-full bg-white/25"
                        style={{ width: `${Math.min(b * 100, 100)}%` }}
                      />
                    )}
                    <div
                      className="absolute inset-y-0 left-0 rounded-full bg-[var(--color-brand)]"
                      style={{ width: `${Math.min(v * 100, 100)}%`, opacity: 0.92 }}
                    />
                  </div>
                  <p className="mono mt-2 text-[11px] text-[var(--color-mute)]">
                    {b === null
                      ? `no baseline defined · n=${r.n ?? "?"}`
                      : `${pct(b)} ${r.baseline_label} · n=${r.n ?? "?"}`}
                  </p>
                </div>
              </div>
            </Reveal>
          );
        })}
      </div>

      <Reveal>
        <p className="mt-5 text-[13px] leading-[1.7] text-[var(--color-mute)]">
          M2 is measured on the RSVQA-LR held-out test split (10,004 QA pairs, 100
          unseen tiles). Every other row is measured on the IndiaSat test split,
          whose patches are separated from train by a deterministic grid hash so
          neighbouring — and therefore overlapping — patches never straddle the
          split. M7&apos;s baseline is the same weights with the visual tokens zeroed:
          the difference is the part of the answer that comes from the image, and
          on multiple choice it is 40 points. It also reaches 0.941 on yes/no and
          0.926 next-token on captions — and <strong className="font-medium text-[var(--color-dim)]">0.000
          on referring boxes</strong>, because it emits four coordinates as words and
          an exact string match on those is close to unwinnable. Grounding is M4&apos;s
          job, scored properly above; the box questions stay in M7&apos;s training mix
          because they teach spatial language, not because M7 is the grounding model.
        </p>
      </Reveal>

      {/* --------------------------------------------- the cloud ablation */}
      {ab && Object.keys(ab).length > 0 && (
        <div className="mt-20 grid gap-10 lg:grid-cols-[1fr_1.15fr] lg:gap-16">
          <Reveal>
            <p className="eyebrow">Why fusion exists</p>
            <h3 className="display mt-4 text-[clamp(1.4rem,2.6vw,1.95rem)] text-white">
              Occlude the optical channel and only the fused model survives.
            </h3>
            <p className="mt-5 text-[14.5px] leading-[1.72] text-[var(--color-mute)]">
              Simulating 50% cloud cover collapses the optical-only model. SAR is
              unaffected — it sees through cloud, day or night — and the fused model
              degrades gracefully instead of failing. During a monsoon flood that
              difference is the difference between an assessment and a wait.
            </p>
          </Reveal>

          <Reveal delay={90}>
            <div className="panel rounded-lg p-6 sm:p-7">
              <div className="mb-6 flex items-center justify-between">
                <span className="mono text-[11px] tracking-[0.14em] text-[var(--color-mute)]">
                  M6 · mAP
                </span>
                <span className="mono text-[11px] text-[var(--color-mute)]">
                  clear vs 50% cloud
                </span>
              </div>
              {[
                { k: "fused", label: "Optical + SAR" },
                { k: "s2_only", label: "Optical only" },
                { k: "s1_only", label: "SAR only" },
              ].map(({ k, label }) => {
                const clear = ab[k];
                const cloud = ab[`${k}_cloud50`];
                if (clear === undefined) return null;
                return (
                  <div key={k} className="mb-6 last:mb-0">
                    <div className="mb-2 flex items-baseline justify-between">
                      <span className="text-[13.5px] text-[var(--color-dim)]">{label}</span>
                      <span className="mono text-[12.5px] tabular-nums text-white">
                        {clear.toFixed(3)}
                        {cloud !== undefined && (
                          <span
                            className={
                              cloud < clear - 0.05
                                ? "ml-2 text-[var(--color-signal)]"
                                : "ml-2 text-[var(--color-verd)]"
                            }
                          >
                            → {cloud.toFixed(3)}
                          </span>
                        )}
                      </span>
                    </div>
                    <div className="relative h-[6px] w-full overflow-hidden rounded-full bg-white/[0.07]">
                      <div
                        className="absolute inset-y-0 left-0 rounded-full bg-[var(--color-brand)]/45"
                        style={{ width: `${clear * 100}%` }}
                      />
                      {cloud !== undefined && (
                        <div
                          className="absolute inset-y-0 left-0 rounded-full bg-[var(--color-brand)]"
                          style={{ width: `${cloud * 100}%` }}
                        />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </Reveal>
        </div>
      )}

      {/* ------------------------------------------------- the registry */}
      <Reveal>
        <p className="eyebrow mt-20">The registry — the router&apos;s only source of models</p>
      </Reveal>
      <div className="mt-8 grid gap-px overflow-hidden rounded-lg border border-[var(--color-line)] bg-[var(--color-line)] sm:grid-cols-2 lg:grid-cols-4">
        {data.models.map((m, i) => (
          <Reveal key={m.id} delay={i * 40}>
            <div className="h-full bg-black p-5">
              <div className="flex items-baseline justify-between">
                <span className="mono text-[12.5px] font-medium text-white">{m.id}</span>
                <span
                  className={`mono text-[10px] tracking-[0.14em] ${
                    m.trained ? "text-[var(--color-verd)]" : "text-[var(--color-signal)]"
                  }`}
                >
                  {m.trained ? "TRAINED" : "PENDING"}
                </span>
              </div>
              <p className="mono mt-1.5 text-[12px] text-[var(--color-brand-soft)]">
                {m.name}
              </p>
              <p className="mono mt-3 text-[10.5px] leading-[1.7] text-[var(--color-mute)]">
                {m.tasks.join(" · ")}
                <br />
                {m.n_images} image{m.n_images > 1 ? "s" : ""} · {m.runtime}
                {m.params_m ? ` · ${m.params_m}M` : ""}
              </p>
            </div>
          </Reveal>
        ))}
      </div>
    </Section>
  );
}
