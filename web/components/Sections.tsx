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
