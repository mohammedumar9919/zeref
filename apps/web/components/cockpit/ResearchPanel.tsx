import Link from "next/link";

import type { CockpitResearchItem } from "@zeref/contracts";
import type { DataAgeState } from "@/lib/data-age";

import { CockpitPanel } from "./CockpitPanel";

type ResearchPanelProps = {
  items: CockpitResearchItem[];
  insufficientData: boolean;
  focused?: boolean;
  dataAgeState?: DataAgeState;
};

export function ResearchPanel({
  items,
  insufficientData,
  focused,
  dataAgeState,
}: ResearchPanelProps): React.ReactElement {
  return (
    <CockpitPanel
      title="Research"
      testId="panel-research"
      focused={focused}
      dataAgeState={dataAgeState}
    >
      {insufficientData ? (
        <p className="text-sm text-hud-muted">
          Insufficient trend data — enqueue a research job to compute signals.
        </p>
      ) : items.length > 0 ? (
        <ul className="space-y-2 text-sm text-hud-primary">
          {items.map((item) => (
            <li key={item.id}>
              <Link
                href={`/cockpit/research/${item.id}`}
                className="block hover:text-hud-cyan"
              >
                <span>{item.title}</span>
                {item.trendScore !== undefined ? (
                  <p className="font-mono text-[10px] text-hud-muted">
                    score {item.trendScore.toFixed(2)}
                    {"signalCount" in item && item.signalCount !== undefined
                      ? ` · ${item.signalCount} signal${item.signalCount === 1 ? "" : "s"}`
                      : ""}
                  </p>
                ) : null}
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-hud-muted">
          No research topics yet — open the hub to create or view trends.
        </p>
      )}
      <Link
        href="/cockpit/research"
        className="mt-auto font-mono text-xs text-hud-cyan hover:underline"
      >
        Open research →
      </Link>
    </CockpitPanel>
  );
}
