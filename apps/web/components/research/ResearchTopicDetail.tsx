import Link from "next/link";

import type { ResearchSignal, ResearchTopicDetail } from "@zeref/contracts";

type ResearchTopicDetailProps = {
  detail: ResearchTopicDetail;
};

function formatScore(score: number): string {
  return score.toFixed(2);
}

function SignalRow({ signal }: { signal: ResearchSignal }): React.ReactElement {
  return (
    <li
      data-testid={`research-signal-${signal.id}`}
      className="rounded border border-hud-border bg-hud-surface/20 px-4 py-3"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <span className="font-mono text-[10px] uppercase tracking-widest text-hud-cyan/80">
          {signal.signalType.replace(/_/g, " ")}
        </span>
        <span className="font-mono text-[10px] text-hud-primary">
          score {formatScore(signal.score)}
        </span>
      </div>
      <p className="mt-1 font-mono text-[10px] text-hud-muted">
        {signal.sourceEntityId
          ? `entity ${signal.sourceEntityId.slice(0, 8)}…`
          : "no entity scope"}
        {signal.computedAt
          ? ` · ${new Date(signal.computedAt).toLocaleString()}`
          : ""}
      </p>
    </li>
  );
}

export function ResearchTopicDetailView({
  detail,
}: ResearchTopicDetailProps): React.ReactElement {
  const { topic, signals } = detail;

  return (
    <section
      data-testid="research-topic-detail"
      className="mx-auto flex w-full max-w-4xl flex-col gap-6 border-t border-hud-border px-4 py-8 md:px-6"
    >
      <header className="space-y-3 border-b border-hud-border pb-4">
        <Link
          href="/cockpit/research"
          className="font-mono text-[10px] uppercase tracking-widest text-hud-cyan hover:underline"
        >
          ← Research hub
        </Link>
        <p className="font-mono text-[10px] uppercase tracking-widest text-hud-cyan/90">
          Research topic
        </p>
        <h1 className="text-lg font-medium text-hud-primary">{topic.title}</h1>
        <div className="flex flex-wrap gap-4 font-mono text-[10px] text-hud-muted">
          <span data-testid="research-topic-trend-score">
            trend {topic.trendScore !== undefined ? formatScore(topic.trendScore) : "—"}
          </span>
          <span data-testid="research-topic-signal-count">
            {topic.signalCount} signal{topic.signalCount === 1 ? "" : "s"}
          </span>
          {topic.lastComputedAt ? (
            <span>
              computed {new Date(topic.lastComputedAt).toLocaleString()}
            </span>
          ) : null}
          {topic.scopeEntityId ? (
            <span>scope entity {topic.scopeEntityId.slice(0, 8)}…</span>
          ) : null}
        </div>
      </header>

      {signals.length === 0 ? (
        <p
          data-testid="research-topic-empty-signals"
          className="rounded border border-hud-border bg-hud-surface/30 px-4 py-6 text-sm text-hud-muted"
        >
          No signals computed for this topic yet. Enqueue a research job to
          aggregate trend data.
        </p>
      ) : (
        <div className="space-y-3">
          <h2 className="font-mono text-[10px] uppercase tracking-widest text-hud-muted">
            Signals ({signals.length})
          </h2>
          <ul
            className="flex flex-col gap-2"
            data-testid="research-topic-signals-list"
          >
            {signals.map((signal) => (
              <SignalRow key={signal.id} signal={signal} />
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
