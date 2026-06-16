import Link from "next/link";

import type { CockpitReportItem } from "@zeref/contracts";
import type { DataAgeState } from "@/lib/data-age";

import { CockpitPanel } from "./CockpitPanel";

type ReportsPanelProps = {
  items: CockpitReportItem[];
  insufficientData: boolean;
  focused?: boolean;
  dataAgeState?: DataAgeState;
};

export function ReportsPanel({
  items,
  insufficientData,
  focused,
  dataAgeState,
}: ReportsPanelProps): React.ReactElement {
  return (
    <CockpitPanel
      title="Reports"
      testId="panel-reports"
      focused={focused}
      dataAgeState={dataAgeState}
    >
      {items.length > 0 ? (
        <ul className="space-y-2 text-sm text-hud-primary">
          {items.map((item) => (
            <li key={item.artifactId}>
              <p>{item.headline}</p>
              <p className="font-mono text-[10px] text-hud-muted">
                {item.kind} · {new Date(item.createdAt).toLocaleDateString()}
              </p>
              <Link
                href={`/cockpit/reports?artifact=${item.artifactId}`}
                className="font-mono text-xs text-hud-cyan hover:underline"
              >
                View artifact →
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-hud-muted">
          {insufficientData
            ? "Report summaries unavailable."
            : "No elite report artifacts yet."}
        </p>
      )}
      <Link
        href="/cockpit/reports"
        className="mt-auto font-mono text-xs text-hud-cyan hover:underline"
      >
        All reports →
      </Link>
    </CockpitPanel>
  );
}
