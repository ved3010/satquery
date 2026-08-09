import {
  CAPABILITIES,
  DATA_NOTE,
  MEASURED,
  PIPELINE,
  PROBLEM,
} from "@/lib/content";
import { Reveal } from "./Chrome";

/* ------------------------------------------------------------ primitives */
export function Section({
  id,
  children,
  className = "",
}: {
  id?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section id={id} className={`border-t border-[var(--color-line)] ${className}`}>
      <div className="mx-auto max-w-[1240px] px-5 py-24 sm:px-8 sm:py-32">{children}</div>
    </section>
  );
}

export function Head({
  kicker,
  title,
  lede,
}: {
  kicker: string;
  title: string;
  lede?: string;
}) {
  return (
    <Reveal>
      <p className="eyebrow">{kicker}</p>
      <h2 className="display mt-5 max-w-[22ch] text-[clamp(1.7rem,3.7vw,2.75rem)] text-white">
        {title}
      </h2>
      {lede && (
        <p className="mt-5 max-w-[62ch] text-[15.5px] leading-[1.7] text-[var(--color-mute)]">
          {lede}
        </p>
      )}
    </Reveal>
  );
}

/* ---------------------------------------------------------------- problem */
export function Problem() {
  return (
    <Section id="problem">
      <Head kicker={PROBLEM.kicker} title={PROBLEM.title} lede={PROBLEM.lede} />
      <div className="mt-16 grid gap-px overflow-hidden rounded-lg border border-[var(--color-line)] bg-[var(--color-line)] sm:grid-cols-2">
        {PROBLEM.points.map((p, i) => (
          <Reveal key={p.n} delay={i * 70}>
            <div className="h-full bg-black p-7 sm:p-9">
              <span className="mono text-[11px] tracking-[0.2em] text-[var(--color-brand-soft)]">
                {p.n}
              </span>
              <h3 className="mt-4 text-[17.5px] font-medium text-white">{p.title}</h3>
              <p className="mt-3 text-[14.5px] leading-[1.7] text-[var(--color-mute)]">
                {p.body}
              </p>
            </div>
          </Reveal>
        ))}
      </div>
    </Section>
  );
}

/* --------------------------------------------------------------- solution */
export function Solution() {
  return (
    <Section id="solution">
      <Head
        kicker="The solution"
        title="One question in. One agent. Seven observable steps."
        lede="A LangGraph state machine classifies the query, checks the inputs can answer it, selects specialists from a declared registry, measures the scene, and returns the answer with the trace that produced it."
      />

      {/* the pipeline */}
      <div className="mt-16 grid gap-px overflow-hidden rounded-lg border border-[var(--color-line)] bg-[var(--color-line)] sm:grid-cols-2 lg:grid-cols-4">
        {PIPELINE.map((s, i) => (
          <Reveal key={s.step} delay={i * 55}>
            <div className="flex h-full flex-col bg-black p-6 sm:p-7">
              <div className="flex items-baseline gap-3">
                <span className="mono text-[11px] text-[var(--color-mute)]">{s.step}</span>
                <span className="mono text-[12px] tracking-[0.16em] text-white">
                  {s.title}
                </span>
              </div>
              <p className="mt-3.5 text-[13.5px] leading-[1.65] text-[var(--color-mute)]">
                {s.body}
              </p>
            </div>
          </Reveal>
        ))}
      </div>

      {/* capability families */}
      <Reveal>
        <p className="eyebrow mt-24">Five task families</p>
      </Reveal>
      <div className="mt-8 grid gap-px overflow-hidden rounded-lg border border-[var(--color-line)] bg-[var(--color-line)] sm:grid-cols-2 lg:grid-cols-3">
        {CAPABILITIES.map((c, i) => (
          <Reveal key={c.n} delay={i * 55}>
            <div className="h-full bg-black p-7">
              <p className="mono text-[10.5px] tracking-[0.18em] text-[var(--color-brand-soft)]">
                {c.tag}
              </p>
              <h3 className="mt-4 text-[16.5px] font-medium text-white">{c.title}</h3>
              <p className="mt-3 text-[14px] leading-[1.7] text-[var(--color-mute)]">
                {c.body}
              </p>
            </div>
          </Reveal>
        ))}
      </div>
    </Section>
  );
}

/* --------------------------------------------------------------- measured */
export function Measured() {
  return (
    <Section id="measured">
      <Head kicker={MEASURED.kicker} title={MEASURED.title} lede={MEASURED.body} />

      <div className="mt-14 grid gap-6 lg:grid-cols-[1fr_1.05fr]">
        <Reveal>
          <div className="panel h-full rounded-lg p-6 sm:p-7">
            <p className="eyebrow">Indices computed per pixel</p>
            <ul className="mt-6 space-y-5">
              {MEASURED.indices.map((ix) => (
                <li
                  key={ix.code}
                  className="border-b border-[var(--color-line)] pb-5 last:border-0 last:pb-0"
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className="mono text-[13px] font-medium text-white">
                      {ix.code}
                    </span>
                    <span className="text-[12.5px] text-[var(--color-mute)]">
                      {ix.reads}
                    </span>
                  </div>
                  <p className="mono mt-2 text-[12.5px] text-[var(--color-brand-soft)]">
                    {ix.formula}
                  </p>
                  <p className="mono mt-1.5 text-[11.5px] text-[var(--color-mute)]">
                    {ix.rule}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </Reveal>

        <Reveal delay={90}>
          <div className="panel h-full overflow-hidden rounded-lg">
            <div className="flex items-center gap-2 border-b border-[var(--color-line)] px-5 py-3">
              <span className="h-2 w-2 rounded-full bg-[var(--color-verd)]" />
              <span className="mono text-[11px] tracking-[0.14em] text-[var(--color-mute)]">
                RUN REPORT · MARKDOWN
              </span>
            </div>
            <pre className="mono overflow-x-auto px-5 py-5 text-[11.5px] leading-[1.85] text-[var(--color-dim)]">
              {MEASURED.sample}
            </pre>
            <p className="border-t border-[var(--color-line)] px-5 py-4 text-[12.5px] leading-[1.6] text-[var(--color-mute)]">
              {MEASURED.sampleNote}
            </p>
          </div>
        </Reveal>
      </div>
    </Section>
  );
}

/* ---------------------------------------------------------------- corpus */
export function Corpus() {
  return (
    <Section>
      <div className="grid gap-12 lg:grid-cols-[1fr_1fr] lg:gap-20">
        <Head kicker={DATA_NOTE.kicker} title={DATA_NOTE.title} />
        <Reveal delay={80}>
          <p className="text-[15px] leading-[1.75] text-[var(--color-mute)]">
            {DATA_NOTE.body}
          </p>
          <dl className="mt-9 grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-[var(--color-line)] bg-[var(--color-line)] sm:grid-cols-4">
            {DATA_NOTE.stats.map((s) => (
              <div key={s.label} className="bg-black px-4 py-5 text-center">
                <dt className="text-[21px] font-medium tracking-tight text-white">
                  {s.value}
                </dt>
                <dd className="mono mt-1.5 text-[10.5px] tracking-[0.14em] text-[var(--color-mute)]">
                  {s.label.toUpperCase()}
                </dd>
              </div>
            ))}
          </dl>
        </Reveal>
      </div>
    </Section>
  );
}
