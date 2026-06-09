import { notFound } from "next/navigation";

import { StudioEditorForm } from "@/components/studio/StudioEditorForm";
import { VoiceHudShell } from "@/components/hud/VoiceHudShell";
import {
  StudioBffError,
  StudioEntityNotFoundError,
  getStudioEntityDetail,
} from "@/lib/studio";

type StudioEntityPageProps = {
  params: Promise<{ entityId: string }>;
};

export default async function StudioEntityPage({
  params,
}: StudioEntityPageProps): Promise<React.ReactElement> {
  const { entityId } = await params;

  try {
    const entity = await getStudioEntityDetail(entityId);

    return (
      <div data-testid="cockpit-studio-entity-page">
        <VoiceHudShell>
          <StudioEditorForm entity={entity} />
        </VoiceHudShell>
      </div>
    );
  } catch (err) {
    if (err instanceof StudioEntityNotFoundError) {
      notFound();
    }
    if (err instanceof StudioBffError) {
      throw err;
    }
    throw err;
  }
}
