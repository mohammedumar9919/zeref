import type { CockpitSlicesV8 } from "@zeref/contracts";

import { CalendarPanel } from "@/components/cockpit/CalendarPanel";
import { ReportsPanel } from "@/components/cockpit/ReportsPanel";
import { ResearchPanel } from "@/components/cockpit/ResearchPanel";
import { StudioPanel } from "@/components/cockpit/StudioPanel";
import { GlobeIsland } from "@/components/globe/GlobeIsland";
import { cn } from "@/lib/cn";

export type CockpitFocus = "studio" | "calendar" | "reports" | "research" | null;

type CockpitGridProps = {
  slices: CockpitSlicesV8;
  focus?: CockpitFocus;
};

export function CockpitGrid({
  slices,
  focus = null,
}: CockpitGridProps): React.ReactElement {
  const { studio, calendar, reports, research } = slices.panels;

  return (
    <div
      data-testid="cockpit-grid"
      className={cn(
        "cockpit-grid mx-auto grid max-w-[1600px] gap-3 px-4 py-3 md:gap-4 md:px-6 md:py-5",
        "grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(320px,1.1fr)_minmax(0,1fr)]",
        "lg:grid-rows-[minmax(45vh,1fr)_auto]",
      )}
    >
      <div className="glass-column flex flex-col gap-3 lg:col-start-1 lg:row-span-2 lg:row-start-1">
        <StudioPanel
          items={studio.items}
          insufficientData={studio.insufficientData}
          focused={focus === "studio"}
        />
        <CalendarPanel
          items={calendar.items}
          insufficientData={calendar.insufficientData}
          focused={focus === "calendar"}
        />
      </div>

      <div className="order-first lg:order-none lg:col-start-2 lg:row-span-2 lg:row-start-1">
        <GlobeIsland />
      </div>

      <div className="glass-column flex flex-col gap-3 lg:col-start-3 lg:row-span-2 lg:row-start-1">
        <ReportsPanel
          items={reports.items}
          insufficientData={reports.insufficientData}
          focused={focus === "reports"}
        />
        <ResearchPanel
          items={research.items}
          insufficientData={research.insufficientData}
          focused={focus === "research"}
        />
      </div>
    </div>
  );
}
