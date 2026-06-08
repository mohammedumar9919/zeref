import { notFound } from "next/navigation";

import { ResearchTopicDetailView } from "@/components/research/ResearchTopicDetail";
import { VoiceHudShell } from "@/components/hud/VoiceHudShell";
import { CockpitBffError } from "@/lib/bff";
import { getResearchTopic } from "@/lib/research-bff";

type ResearchTopicPageProps = {
  params: Promise<{ topicId: string }>;
};

export default async function ResearchTopicPage({
  params,
}: ResearchTopicPageProps): Promise<React.ReactElement> {
  const { topicId } = await params;
  const result = await getResearchTopic(topicId);

  if (result.status === 404) {
    notFound();
  }

  if (result.status !== 200) {
    throw new CockpitBffError(
      "body" in result && "error" in result.body
        ? result.body.error
        : "failed to load research topic",
      result.status,
    );
  }

  return (
    <div data-testid="cockpit-research-topic-page">
      <VoiceHudShell>
        <ResearchTopicDetailView detail={result.body} />
      </VoiceHudShell>
    </div>
  );
}
