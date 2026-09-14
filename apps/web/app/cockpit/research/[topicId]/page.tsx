import { notFound } from "next/navigation";

import { ResearchTopicDetailView } from "@/components/research/ResearchTopicDetail";
import { CockpitBffError } from "@/lib/bff";
import { getResearchIntel, getResearchTopic } from "@/lib/research-bff";

type ResearchTopicPageProps = {
  params: Promise<{ topicId: string }>;
};

export default async function ResearchTopicPage({
  params,
}: ResearchTopicPageProps): Promise<React.ReactElement> {
  const { topicId } = await params;
  const [result, intelResult] = await Promise.all([
    getResearchTopic(topicId),
    getResearchIntel(topicId),
  ]);

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
    <div data-testid="cockpit-research-topic-page" className="cockpit-workspace">
      <ResearchTopicDetailView
        detail={result.body}
        intel={intelResult.status === 200 ? intelResult.body : undefined}
      />
    </div>
  );
}
