import Link from "next/link";

import type { CockpitStudioItemV8 } from "@zeref/contracts";
import type { DataAgeState } from "@/lib/data-age";

import { CockpitPanel } from "./CockpitPanel";

type StudioPanelProps = {
  items: CockpitStudioItemV8[];
  insufficientData: boolean;
  focused?: boolean;
  dataAgeState?: DataAgeState;
};

export function StudioPanel({
  items,
  insufficientData,
  focused,
  dataAgeState,
}: StudioPanelProps): React.ReactElement {
  return (
    <CockpitPanel
      title="Studio"
      testId="panel-studio"
      focused={focused}
      dataAgeState={dataAgeState}
    >
      {items.length > 0 ? (
        <ul className="space-y-2 text-sm text-hud-primary">
          {items.map((item) => (
            <li key={item.entityId}>
              <Link
                href={`/cockpit/studio/${item.entityId}`}
                className="cursor-pointer text-hud-primary transition-colors hover:text-hud-cyan"
              >
                {item.title}
              </Link>
              {item.hasDraft && item.draftPreview ? (
                <p className="font-mono text-[10px] text-amber-200/90">
                  draft · {item.draftPreview}
                </p>
              ) : item.hasDraft ? (
                <p className="font-mono text-[10px] text-amber-200/90">draft saved</p>
              ) : null}
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
        className="mt-auto cursor-pointer font-mono text-xs text-hud-cyan hover:underline"
      >
        Open studio →
      </Link>
    </CockpitPanel>
  );
}
