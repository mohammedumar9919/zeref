import type { CockpitSlices } from "@zeref/contracts";

import { CalendarPanel } from "@/components/cockpit/CalendarPanel";
import { ReportsPanel } from "@/components/cockpit/ReportsPanel";
import { ResearchPanel } from "@/components/cockpit/ResearchPanel";
import { StudioPanel } from "@/components/cockpit/StudioPanel";
import { GlobeIsland } from "@/components/globe/GlobeIsland";
import { cn } from "@/lib/cn";

export type CockpitFocus = "studio" | "calendar" | "reports" | "research" | null;

type CockpitGridProps = {
  slices: CockpitSlices;
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
        "cockpit-grid mx-auto grid max-w-[1600px] gap-4 px-4 py-6 md:px-6",
        "grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(280px,420px)_minmax(0,1fr)]",
        "lg:grid-rows-[auto_auto]",
      )}
    >
      <div className="flex flex-col gap-4 lg:col-start-1 lg:row-span-2">
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

      <div className="lg:col-start-2 lg:row-span-2 lg:row-start-1">
        <GlobeIsland />
      </div>

      <div className="flex flex-col gap-4 lg:col-start-3 lg:row-span-2">
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
