import { CockpitShell } from "@/components/cockpit/CockpitShell";
import { getCockpitSlices } from "@/lib/bff";

export default async function ResearchDeepLinkPage(): Promise<React.ReactElement> {
  const slices = await getCockpitSlices();

  return (
    <CockpitShell
      slices={slices}
      focus="research"
      pageTestId="cockpit-research-page"
    />
  );
}
