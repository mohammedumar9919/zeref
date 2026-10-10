import {
  getVoiceLatencySummary,
  recordVoiceLatencySample,
} from "@/lib/voice/voice-latency-store";

export const dynamic = "force-dynamic";

/** GET /api/v1/ops/voice-latency — first-audio summary over real client samples (C10). */
export async function GET(): Promise<Response> {
  return Response.json(getVoiceLatencySummary());
}

/** POST /api/v1/ops/voice-latency — record one client-measured first-audio sample (C10). */
export async function POST(request: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "invalid JSON body" }, { status: 400 });
  }
  const result = recordVoiceLatencySample(body);
  if (!result.ok) {
    return Response.json({ error: result.error }, { status: 400 });
  }
  return Response.json({ accepted: true, count: getVoiceLatencySummary().count }, { status: 202 });
}
