import { CockpitGrid } from "@/components/cockpit/CockpitGrid";
import { getCockpitSlices } from "@/lib/bff";

export default async function CalendarDeepLinkPage(): Promise<React.ReactElement> {
  const slices = await getCockpitSlices();

  return (
    <div data-testid="cockpit-calendar-page">
      <CockpitGrid slices={slices} focus="calendar" />
    </div>
  );
}
