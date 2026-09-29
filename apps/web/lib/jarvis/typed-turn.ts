/** Client helpers for typed HUD turns — same agent path as voice (CLOUD-C1). */

export const TYPED_TURN_ERROR_COPY = "Jarvis couldn't answer — try again";
export const TYPED_TURN_CANCEL_COPY = "Cancelled — nothing queued.";

const JARVIS_RUN_URL = "/api/v1/jarvis/run";

export type TypedPendingConfirm = {
  toolName: string;
  args: Record<string, unknown>;
};

export type TypedTurnResult = {
  runId: string;
  resultText: string;
  ackText?: string;
  terminalReason?: string;
  pendingConfirm?: TypedPendingConfirm;
};

type JarvisRunBody = {
  turnId: string;
  transcript: string;
  confirmed?: boolean;
  runId?: string;
};

async function postJarvisRun(body: JarvisRunBody): Promise<TypedTurnResult> {
  const res = await fetch(JARVIS_RUN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    let message = `jarvis run failed: ${res.status}`;
    try {
      const payload = (await res.json()) as { error?: unknown };
      if (typeof payload.error === "string" && payload.error.length > 0) {
        message = payload.error;
      }
    } catch {
      /* non-JSON error body */
    }
    throw new Error(message);
  }

  return (await res.json()) as TypedTurnResult;
}

export function sendTypedTurn(transcript: string): Promise<TypedTurnResult> {
  return postJarvisRun({
    turnId: crypto.randomUUID(),
    transcript: transcript.trim(),
  });
}

/** Only call from an explicit operator Confirm click — never auto-confirm. */
export function confirmTypedTurn(
  transcript: string,
  runId: string,
): Promise<TypedTurnResult> {
  return postJarvisRun({
    turnId: crypto.randomUUID(),
    transcript: transcript.trim(),
    confirmed: true,
    runId,
  });
}
