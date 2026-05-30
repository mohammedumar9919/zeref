import { CockpitGrid } from "@/components/cockpit/CockpitGrid";
import { getCockpitSlices } from "@/lib/bff";

export default async function ResearchDeepLinkPage(): Promise<React.ReactElement> {
  const slices = await getCockpitSlices();

  return (
    <div data-testid="cockpit-research-page">
      <CockpitGrid slices={slices} focus="research" />
    </div>
  );
}
