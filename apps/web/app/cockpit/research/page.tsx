import { ResearchHub } from "@/components/research/ResearchHub";
import { CockpitGrid } from "@/components/cockpit/CockpitGrid";
import { VoiceHudShell } from "@/components/hud/VoiceHudShell";
import { CockpitBffError, getCockpitSlices } from "@/lib/bff";
import { listResearchTopics } from "@/lib/research-bff";

export default async function ResearchDeepLinkPage(): Promise<React.ReactElement> {
  const slices = await getCockpitSlices();
  const topicsResult = await listResearchTopics();

  if (topicsResult.status !== 200) {
    throw new CockpitBffError(
      "body" in topicsResult && "error" in topicsResult.body
        ? topicsResult.body.error
        : "failed to load research topics",
      topicsResult.status,
    );
  }

  return (
    <div data-testid="cockpit-research-page">
      <VoiceHudShell>
        <CockpitGrid slices={slices} focus="research" />
        <ResearchHub topics={topicsResult.body.topics} />
      </VoiceHudShell>
    </div>
  );
}
