import Link from "next/link";

import type { CockpitCalendarItemV8 } from "@zeref/contracts";

import { CockpitPanel } from "./CockpitPanel";

type CalendarPanelProps = {
  items: CockpitCalendarItemV8[];
  insufficientData: boolean;
  focused?: boolean;
};

export function CalendarPanel({
  items,
  insufficientData,
  focused,
}: CalendarPanelProps): React.ReactElement {
  return (
    <CockpitPanel title="Calendar" testId="panel-calendar" focused={focused}>
      {items.length > 0 ? (
        <ul className="space-y-2 text-sm text-hud-primary">
          {items.map((item) => (
            <li key={item.id}>
              <span>{item.title}</span>
              {item.status ? (
                <p className="font-mono text-[10px] text-amber-200/80">{item.status}</p>
              ) : null}
              {item.scheduledAt ? (
                <p className="font-mono text-[10px] text-hud-muted">
                  {new Date(item.scheduledAt).toLocaleString()}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-hud-muted">
          {insufficientData
            ? "Calendar data unavailable."
            : "Schedule shell — no events queued."}
        </p>
      )}
      <Link
        href="/cockpit/calendar"
        className="mt-auto cursor-pointer font-mono text-xs text-hud-cyan hover:underline"
      >
        Open calendar →
      </Link>
    </CockpitPanel>
  );
}
