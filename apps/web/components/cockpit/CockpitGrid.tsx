import type { CockpitSlicesV8, CockpitSlicesV9 } from "@zeref/contracts";

import { CalendarPanel } from "@/components/cockpit/CalendarPanel";
import { ReportsPanel } from "@/components/cockpit/ReportsPanel";
import { ResearchPanel } from "@/components/cockpit/ResearchPanel";
import { StudioPanel } from "@/components/cockpit/StudioPanel";
import { GlobeHero } from "@/components/globe/GlobeHero";
import { cn } from "@/lib/cn";

export type CockpitFocus = "studio" | "calendar" | "reports" | "research" | null;

type CockpitGridProps = {
  slices: CockpitSlicesV8 | CockpitSlicesV9;
  focus?: CockpitFocus;
};

export function CockpitGrid({
  slices,
  focus = null,
}: CockpitGridProps): React.ReactElement {
  const { studio, calendar, reports, research } = slices.panels;
  const workspaceMode = focus != null;

  return (
    <>
      {workspaceMode ? (
        <div
          data-testid="workspace-mode"
          data-workspace-surface={focus}
          className="cockpit-workspace-mode mx-auto max-w-[1600px] px-4 py-1.5 font-mono text-[10px] uppercase tracking-[0.28em] text-hud-cyan/75 md:px-6"
        >
          Workspace · {focus}
        </div>
      ) : null}
      <div
        data-testid="cockpit-grid"
        hidden={workspaceMode}
        aria-hidden={workspaceMode}
        className={cn(
          "cockpit-grid mx-auto max-w-[1600px] gap-2 px-3 py-2 md:gap-2.5 md:px-5 md:py-3",
          workspaceMode
            ? "hidden cockpit-grid--workspace"
            : [
                "grid grid-cols-1",
                "lg:grid-cols-[minmax(0,0.72fr)_minmax(280px,1.45fr)_minmax(0,0.72fr)]",
                "lg:grid-rows-[minmax(58vh,1fr)_auto]",
              ],
        )}
      >
        <div className="glass-column flex flex-col gap-2 lg:col-start-1 lg:row-span-2 lg:row-start-1">
          <StudioPanel
            items={studio.items}
            insufficientData={studio.insufficientData}
            focused={focus === "studio"}
            dataAgeState={"dataAgeState" in studio ? studio.dataAgeState : undefined}
          />
          <CalendarPanel
            items={calendar.items}
            insufficientData={calendar.insufficientData}
            focused={focus === "calendar"}
            dataAgeState={
              "dataAgeState" in calendar ? calendar.dataAgeState : undefined
            }
          />
        </div>

        <div className="order-first lg:order-none lg:col-start-2 lg:row-span-2 lg:row-start-1">
          {workspaceMode ? null : <GlobeHero />}
        </div>

        <div className="glass-column flex flex-col gap-2 lg:col-start-3 lg:row-span-2 lg:row-start-1">
          <ReportsPanel
            items={reports.items}
            insufficientData={reports.insufficientData}
            focused={focus === "reports"}
            dataAgeState={"dataAgeState" in reports ? reports.dataAgeState : undefined}
          />
          <ResearchPanel
            items={research.items}
            insufficientData={research.insufficientData}
            focused={focus === "research"}
            dataAgeState={
              "dataAgeState" in research ? research.dataAgeState : undefined
            }
          />
        </div>
      </div>
    </>
  );
}
