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
