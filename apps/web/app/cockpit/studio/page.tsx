import { CockpitShell } from "@/components/cockpit/CockpitShell";
import { getCockpitSlices } from "@/lib/bff";

export default async function StudioDeepLinkPage(): Promise<React.ReactElement> {
  const slices = await getCockpitSlices();

  return (
    <CockpitShell slices={slices} focus="studio" pageTestId="cockpit-studio-page" />
  );
}
