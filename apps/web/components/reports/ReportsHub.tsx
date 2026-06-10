import Link from "next/link";

import type { CockpitReportItem } from "@zeref/contracts";

type ReportsHubProps = {
  items: CockpitReportItem[];
  insufficientData: boolean;
};

export function ReportsHub({
  items,
  insufficientData,
}: ReportsHubProps): React.ReactElement {
  return (
    <section
      data-testid="reports-hub"
      className="mx-auto flex w-full max-w-4xl flex-col gap-6 border-t border-hud-border px-4 py-8 md:px-6"
    >
      <header className="space-y-2">
        <p className="font-mono text-[10px] uppercase tracking-widest text-hud-cyan/90">
          Reports hub
        </p>
        <h2 className="text-lg font-medium text-hud-primary">Elite artifacts</h2>
        <p className="text-sm text-hud-muted">
          Read-only elite report payloads from the analyze → report pipeline (Phase
          4)
        </p>
      </header>

      {items.length === 0 ? (
        <p
          data-testid="reports-hub-empty"
          className="rounded border border-hud-border bg-hud-surface/30 px-4 py-6 text-sm text-hud-muted"
        >
          {insufficientData
            ? "Report summaries unavailable."
            : "No elite report artifacts yet."}
        </p>
      ) : (
        <ul className="flex flex-col gap-3" data-testid="reports-hub-item-list">
          {items.map((item) => (
            <li key={item.artifactId}>
              <Link
                href={`/cockpit/reports?artifact=${item.artifactId}`}
                data-testid={`reports-hub-item-${item.artifactId}`}
                className="block rounded border border-hud-border bg-hud-surface/20 px-4 py-3 transition-colors hover:border-hud-cyan/40 hover:bg-hud-cyan/5"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <span className="text-sm font-medium text-hud-primary">
                    {item.headline}
                  </span>
                  <span className="font-mono text-[10px] uppercase tracking-widest text-hud-cyan/80">
                    {item.kind}
                  </span>
                </div>
                <p className="mt-1 font-mono text-[10px] text-hud-muted">
                  {new Date(item.createdAt).toLocaleString()}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
