import { notFound } from "next/navigation";

import { CockpitGrid } from "@/components/cockpit/CockpitGrid";
import { ReportArtifactDetail } from "@/components/reports/ReportArtifactDetail";
import { ReportsHub } from "@/components/reports/ReportsHub";
import { CockpitBffError, getCockpitSlices } from "@/lib/bff";
import { getReportArtifact } from "@/lib/cockpit-bff";

type ReportsPageProps = {
  searchParams: Promise<{ artifact?: string }>;
};

export default async function ReportsDeepLinkPage({
  searchParams,
}: ReportsPageProps): Promise<React.ReactElement> {
  const slices = await getCockpitSlices();
  const { artifact } = await searchParams;
  const { items, insufficientData } = slices.panels.reports;

  let belowGrid: React.ReactElement;
  if (artifact) {
    const result = await getReportArtifact(artifact);

    if (result.status === 404) {
      notFound();
    }

    if (result.status !== 200) {
      throw new CockpitBffError(
        "body" in result && "error" in result.body
          ? result.body.error
          : "failed to load report artifact",
        result.status,
      );
    }

    belowGrid = (
      <ReportArtifactDetail artifactId={artifact} report={result.body} />
    );
  } else {
    belowGrid = <ReportsHub items={items} insufficientData={insufficientData} />;
  }

  return (
    <div data-testid="cockpit-reports-page">
      <CockpitGrid slices={slices} focus="reports" />
      {belowGrid}
    </div>
  );
}
