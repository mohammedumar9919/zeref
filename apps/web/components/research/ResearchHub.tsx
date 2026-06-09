import Link from "next/link";

import type { ResearchTopic } from "@zeref/contracts";

type ResearchHubProps = {
  topics: ResearchTopic[];
};

function formatTrendScore(score: number | undefined): string {
  return score !== undefined ? score.toFixed(2) : "—";
}

export function ResearchHub({ topics }: ResearchHubProps): React.ReactElement {
  return (
    <section
      data-testid="research-hub"
      className="mx-auto flex w-full max-w-4xl flex-col gap-6 border-t border-hud-border px-4 py-8 md:px-6"
    >
      <header className="space-y-2">
        <p className="font-mono text-[10px] uppercase tracking-widest text-hud-cyan/90">
          Research hub
        </p>
        <h2 className="text-lg font-medium text-hud-primary">Trend topics</h2>
        <p className="text-sm text-hud-muted">
          Worker-backed trend scores from metric facts and embeddings (Phase 9)
        </p>
      </header>

      {topics.length === 0 ? (
        <p
          data-testid="research-hub-empty"
          className="rounded border border-hud-border bg-hud-surface/30 px-4 py-6 text-sm text-hud-muted"
        >
          No research topics yet. Create a topic seed or enqueue a research job to
          compute trend signals.
        </p>
      ) : (
        <ul className="flex flex-col gap-3" data-testid="research-hub-topic-list">
          {topics.map((topic) => (
            <li key={topic.id}>
              <Link
                href={`/cockpit/research/${topic.id}`}
                data-testid={`research-hub-topic-${topic.id}`}
                className="block rounded border border-hud-border bg-hud-surface/20 px-4 py-3 transition-colors hover:border-hud-cyan/40 hover:bg-hud-cyan/5"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <span className="text-sm font-medium text-hud-primary">
                    {topic.title}
                  </span>
                  <span className="font-mono text-[10px] uppercase tracking-widest text-hud-cyan/80">
                    trend {formatTrendScore(topic.trendScore)}
                  </span>
                </div>
                <p className="mt-1 font-mono text-[10px] text-hud-muted">
                  {topic.signalCount} signal{topic.signalCount === 1 ? "" : "s"}
                  {topic.lastComputedAt
                    ? ` · computed ${new Date(topic.lastComputedAt).toLocaleString()}`
                    : ""}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
