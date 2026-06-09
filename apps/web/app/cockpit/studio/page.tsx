import { CockpitGrid } from "@/components/cockpit/CockpitGrid";
import { StudioHub } from "@/components/studio/StudioHub";
import { VoiceHudShell } from "@/components/hud/VoiceHudShell";
import { getCockpitSlices } from "@/lib/bff";

export default async function StudioDeepLinkPage(): Promise<React.ReactElement> {
  const slices = await getCockpitSlices();
  const { items, insufficientData } = slices.panels.studio;

  return (
    <div data-testid="cockpit-studio-page">
      <VoiceHudShell>
        <CockpitGrid slices={slices} focus="studio" />
        <StudioHub items={items} insufficientData={insufficientData} />
      </VoiceHudShell>
    </div>
  );
}
