import { handleVoiceTurn } from "@/lib/voice/handle-turn";

export const dynamic = "force-dynamic";

/** POST /api/v1/voice/turn — PTT audio → STT → jarvis-kernel (Amendment A). */
export async function POST(request: Request): Promise<Response> {
  try {
    const form = await request.formData();
    const audio = form.get("audio");

    if (!(audio instanceof Blob)) {
      return Response.json({ error: "missing audio field" }, { status: 400 });
    }

    return await handleVoiceTurn(audio);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "voice turn failed";
    return Response.json({ error: message }, { status: 500 });
  }
}
