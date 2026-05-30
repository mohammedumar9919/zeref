import { CockpitShell } from "@/components/cockpit/CockpitShell";
import { getCockpitSlices } from "@/lib/bff";

export default async function CalendarDeepLinkPage(): Promise<React.ReactElement> {
  const slices = await getCockpitSlices();

  return (
    <CockpitShell
      slices={slices}
      focus="calendar"
      pageTestId="cockpit-calendar-page"
    />
  );
}
