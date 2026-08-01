import data from "@/lib/models.json";

export function Footer() {
  return (
    <footer className="border-t border-[var(--color-line)]">
      <div className="mx-auto max-w-[1240px] px-5 py-16 sm:px-8">
        <div className="flex flex-col gap-10 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="mono text-[12.5px] tracking-[0.2em] text-white">SATQUERY AI</p>
            <p className="mt-3 max-w-[42ch] text-[13.5px] leading-[1.7] text-[var(--color-mute)]">
              Agentic vision-language assistant for multimodal remote sensing.
              Smart India Hackathon 2026, problem statement 26167, ISRO / Space
              Applications Centre.
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-4 text-[12.5px] text-[var(--color-mute)]">
              <a href="/about" className="hover:text-white transition-colors">About</a>
              <span>·</span>
              <a href="/console" className="hover:text-white transition-colors">Console</a>
              <span>·</span>
              <a href="/#problem" className="hover:text-white transition-colors">Problem</a>
              <span>·</span>
              <a href="/#solution" className="hover:text-white transition-colors">Solution</a>
              <span>·</span>
