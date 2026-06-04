import { CalendarScheduler } from "@/components/calendar/CalendarScheduler";
import { CockpitGrid } from "@/components/cockpit/CockpitGrid";
import { VoiceHudShell } from "@/components/hud/VoiceHudShell";
import { CockpitBffError, getCockpitSlices } from "@/lib/bff";
import { listCalendarEvents } from "@/lib/calendar-bff";

export default async function CalendarDeepLinkPage(): Promise<React.ReactElement> {
  const slices = await getCockpitSlices();
  const eventsResult = await listCalendarEvents();

  if (eventsResult.status !== 200) {
    throw new CockpitBffError(
      "body" in eventsResult && "error" in eventsResult.body
        ? eventsResult.body.error
        : "failed to load calendar events",
      eventsResult.status,
    );
  }

  return (
    <div data-testid="cockpit-calendar-page">
      <VoiceHudShell>
        <CockpitGrid slices={slices} focus="calendar" />
        <CalendarScheduler initialEvents={eventsResult.body.events} />
      </VoiceHudShell>
    </div>
  );
}
