import Link from "next/link";

import type { EliteReport } from "@zeref/contracts";

import { ReportCharts } from "./ReportCharts";
import { buildReportCharts, formatEliteNarrative } from "./report-view";

type ReportArtifactDetailProps = {
  artifactId: string;
  report: EliteReport;
};

const PRIORITY_TONE: Record<string, string> = {
  high: "text-amber-200/90",
  medium: "text-hud-cyan/90",
  low: "text-hud-muted",
};

export function ReportArtifactDetail({
  artifactId,
  report,
}: ReportArtifactDetailProps): React.ReactElement {
  const periodStart = new Date(report.period.start).toLocaleDateString();
  const periodEnd = new Date(report.period.end).toLocaleDateString();
  const narrative = formatEliteNarrative(report);
  const charts = buildReportCharts(report);

  return (
    <section
      data-testid="report-artifact-detail"
      className="mx-auto flex w-full max-w-4xl flex-col gap-6 border-t border-hud-border px-4 py-8 md:px-6"
    >
      <header className="space-y-3 border-b border-hud-border pb-4">
        <Link
          href="/cockpit/reports"
          className="font-mono text-[10px] uppercase tracking-widest text-hud-cyan hover:underline"
        >
          ← Reports hub
        </Link>
        <p className="font-mono text-[10px] uppercase tracking-widest text-hud-cyan/90">
          Elite artifact
        </p>
        <h1
          data-testid="report-artifact-headline"
          className="text-lg font-medium text-hud-primary"
        >
          {report.headline.text}
        </h1>
        <div className="flex flex-wrap gap-4 font-mono text-[10px] text-hud-muted">
          <span data-testid="report-artifact-id">id {artifactId.slice(0, 8)}…</span>
          <span data-testid="report-artifact-period">
            period {periodStart} – {periodEnd}
          </span>
          {report.insufficientData ? (
            <span className="text-amber-200/90">insufficient data</span>
          ) : null}
        </div>
      </header>

      <article
        data-testid="report-narrative"
        className="rounded border border-hud-border bg-hud-surface/20 px-4 py-4"
      >
        <h2 className="font-mono text-[10px] uppercase tracking-widest text-hud-muted">
          Narrative
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-hud-primary">{narrative}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {report.niche.pillars.map((pillar) => (
            <span
              key={pillar}
              className="rounded border border-hud-cyan/30 px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest text-hud-cyan"
            >
              {pillar.replace(/_/g, " ")}
            </span>
          ))}
          <span className="rounded border border-hud-border px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest text-hud-muted">
            {report.cohort.label.replace(/_/g, " ")} · n={report.cohort.sampleSize}
          </span>
          <span className="rounded border border-hud-border px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest text-hud-muted">
            vs cohort {report.engagement.vsCohort}
          </span>
        </div>
      </article>

      <ReportCharts charts={charts} />

      <section
        data-testid="report-section-recommendations"
        className="rounded border border-hud-border bg-hud-surface/20 px-4 py-4"
      >
        <h2 className="font-mono text-[10px] uppercase tracking-widest text-hud-muted">
          Recommendations
        </h2>
        {report.recommendations.length === 0 ? (
          <p className="mt-2 text-sm text-hud-muted">No recommendations in this artifact.</p>
        ) : (
          <ol className="mt-3 flex flex-col gap-2">
            {report.recommendations.map((rec) => (
              <li
                key={`${rec.priority}-${rec.text}`}
                className="flex flex-col gap-1 rounded border border-hud-border/70 px-3 py-2"
              >
                <span
                  className={`font-mono text-[10px] uppercase tracking-widest ${PRIORITY_TONE[rec.priority] ?? "text-hud-muted"}`}
                >
                  {rec.priority}
                </span>
                <span className="text-sm text-hud-primary">{rec.text}</span>
              </li>
            ))}
          </ol>
        )}
      </section>

      <details
        data-testid="report-raw-json"
        className="rounded border border-hud-border/60 bg-hud-surface/10 px-4 py-3"
      >
        <summary className="cursor-pointer font-mono text-[10px] uppercase tracking-widest text-hud-muted">
          Raw elite JSON (advanced)
        </summary>
        <pre className="mt-2 overflow-x-auto whitespace-pre-wrap font-mono text-[11px] leading-relaxed text-hud-muted">
          {JSON.stringify(report, null, 2)}
        </pre>
      </details>
    </section>
  );
}
