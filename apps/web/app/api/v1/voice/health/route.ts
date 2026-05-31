import {
  checkWhisperHealth,
  getVoiceMockFlags,
  isWhisperMockEnabled,
} from "@/lib/voice";
import type { VoiceHealthResponse } from "@/lib/voice/types";

export const dynamic = "force-dynamic";

/** GET /api/v1/voice/health — Whisper sidecar reachability + mock flags. */
export async function GET(): Promise<Response> {
  const whisper = await checkWhisperHealth();
  const flags = getVoiceMockFlags();

  const body: VoiceHealthResponse = {
    whisper: {
      mock: isWhisperMockEnabled(),
      url: whisper.url,
      reachable: whisper.ok,
      model: whisper.model,
    },
    flags,
  };

  return Response.json(body);
}
