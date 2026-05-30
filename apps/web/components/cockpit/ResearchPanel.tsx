import Link from "next/link";

import type { CockpitResearchItem } from "@zeref/contracts";

import { CockpitPanel } from "./CockpitPanel";

type ResearchPanelProps = {
  items: CockpitResearchItem[];
  insufficientData: boolean;
  focused?: boolean;
};

export function ResearchPanel({
  items,
  insufficientData,
  focused,
}: ResearchPanelProps): React.ReactElement {
  return (
    <CockpitPanel title="Research" testId="panel-research" focused={focused}>
      {insufficientData ? (
        <p className="text-sm text-hud-muted">
          Insufficient trend data — research pipelines arrive in Phase 9.
        </p>
      ) : items.length > 0 ? (
        <ul className="space-y-2 text-sm text-hud-primary">
          {items.map((item) => (
            <li key={item.id}>
              <span>{item.title}</span>
              {item.trendScore !== undefined ? (
                <p className="font-mono text-[10px] text-hud-muted">
                  score {item.trendScore.toFixed(2)}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-hud-muted">Research panel placeholder.</p>
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
