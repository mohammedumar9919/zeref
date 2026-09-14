import { ResearchHub } from "@/components/research/ResearchHub";
import { CockpitGrid } from "@/components/cockpit/CockpitGrid";
import { CockpitBffError, getCockpitSlices } from "@/lib/bff";
import { getResearchIntel, listResearchTopics } from "@/lib/research-bff";

export default async function ResearchDeepLinkPage(): Promise<React.ReactElement> {
  const [slices, topicsResult, intelResult] = await Promise.all([
    getCockpitSlices(),
    listResearchTopics(),
    getResearchIntel(),
  ]);

  if (topicsResult.status !== 200) {
    throw new CockpitBffError(
      "body" in topicsResult && "error" in topicsResult.body
        ? topicsResult.body.error
        : "failed to load research topics",
      topicsResult.status,
    );
  }

  return (
    <div data-testid="cockpit-research-page" className="cockpit-workspace">
      <CockpitGrid slices={slices} focus="research" />
      <ResearchHub
        topics={topicsResult.body.topics}
        intel={intelResult.status === 200 ? intelResult.body : undefined}
      />
    </div>
  );
}
