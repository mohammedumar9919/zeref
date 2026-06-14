import { CockpitGrid } from "@/components/cockpit/CockpitGrid";
import { getCockpitSlices } from "@/lib/bff";

export default async function CockpitPage(): Promise<React.ReactElement> {
  const slices = await getCockpitSlices();

  return (
    <div data-testid="cockpit-page">
      <CockpitGrid slices={slices} />
    </div>
  );
}
