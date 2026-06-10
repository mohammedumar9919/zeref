import Link from "next/link";

import type { EliteReport } from "@zeref/contracts";

type ReportArtifactDetailProps = {
  artifactId: string;
  report: EliteReport;
};

function JsonSection({
  title,
  testId,
  data,
}: {
  title: string;
  testId: string;
  data: unknown;
}): React.ReactElement {
  return (
    <div
      data-testid={testId}
      className="rounded border border-hud-border bg-hud-surface/20 px-4 py-3"
    >
      <h3 className="font-mono text-[10px] uppercase tracking-widest text-hud-muted">
        {title}
      </h3>
      <pre className="mt-2 overflow-x-auto whitespace-pre-wrap font-mono text-[11px] leading-relaxed text-hud-primary">
        {JSON.stringify(data, null, 2)}
      </pre>
    </div>
  );
}

export function ReportArtifactDetail({
  artifactId,
  report,
}: ReportArtifactDetailProps): React.ReactElement {
  const periodStart = new Date(report.period.start).toLocaleDateString();
  const periodEnd = new Date(report.period.end).toLocaleDateString();

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

      <div className="flex flex-col gap-3">
        <JsonSection title="Engagement" testId="report-section-engagement" data={report.engagement} />
        <JsonSection title="Niche" testId="report-section-niche" data={report.niche} />
        <JsonSection title="Cohort" testId="report-section-cohort" data={report.cohort} />
        <JsonSection
          title="Recommendations"
          testId="report-section-recommendations"
          data={report.recommendations}
        />
        <JsonSection title="Narrative" testId="report-section-narrative" data={report.narrative} />
      </div>
    </section>
  );
}
