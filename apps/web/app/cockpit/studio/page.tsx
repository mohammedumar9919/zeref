import { CockpitGrid } from "@/components/cockpit/CockpitGrid";
import { getCockpitSlices } from "@/lib/bff";

export default async function StudioDeepLinkPage(): Promise<React.ReactElement> {
  const slices = await getCockpitSlices();

  return (
    <div data-testid="cockpit-studio-page">
      <CockpitGrid slices={slices} focus="studio" />
    </div>
  );
}
