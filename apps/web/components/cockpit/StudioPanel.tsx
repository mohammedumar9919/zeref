import Link from "next/link";

import type { CockpitStudioItem } from "@zeref/contracts";

import { CockpitPanel } from "./CockpitPanel";

type StudioPanelProps = {
  items: CockpitStudioItem[];
  insufficientData: boolean;
  focused?: boolean;
};

export function StudioPanel({
  items,
  insufficientData,
  focused,
}: StudioPanelProps): React.ReactElement {
  return (
    <CockpitPanel title="Studio" testId="panel-studio" focused={focused}>
      {items.length > 0 ? (
        <ul className="space-y-2 text-sm text-hud-primary">
          {items.map((item) => (
            <li key={item.entityId}>
              <span>{item.title}</span>
              {item.snapshotId ? (
                <p className="font-mono text-[10px] text-hud-muted">
                  snapshot {item.snapshotId.slice(0, 8)}…
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-hud-muted">
          {insufficientData
            ? "Insufficient normalized entity data."
            : "No studio snapshots yet."}
        </p>
      )}
      <Link
        href="/cockpit/studio"
        className="mt-auto font-mono text-xs text-hud-cyan hover:underline"
      >
        Open studio →
      </Link>
    </CockpitPanel>
  );
}
