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
