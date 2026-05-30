import { CockpitGrid } from "@/components/cockpit/CockpitGrid";
import { getCockpitSlices } from "@/lib/bff";

type ReportsPageProps = {
  searchParams: Promise<{ artifact?: string }>;
};

export default async function ReportsDeepLinkPage({
  searchParams,
}: ReportsPageProps): Promise<React.ReactElement> {
  const slices = await getCockpitSlices();
  const { artifact } = await searchParams;

  return (
    <div data-testid="cockpit-reports-page">
      {artifact ? (
        <p className="px-4 py-2 font-mono text-[10px] text-hud-muted md:px-6">
          Artifact detail loads via GET /api/v1/reports/artifacts/{artifact}
        </p>
      ) : null}
      <CockpitGrid slices={slices} focus="reports" />
    </div>
  );
}
