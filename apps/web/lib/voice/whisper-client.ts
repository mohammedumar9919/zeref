import { isWhisperMockEnabled } from "./mock-flags";

/** Fixture transcript for CI / verify (ADR-020). */
export const WHISPER_MOCK_TRANSCRIPT =
  "What's the latest report headline?";

export type WhisperTranscribeResult = {
  text: string;
  language?: string;
  durationMs?: number;
  mocked: boolean;
};

export type WhisperHealthResult = {
  ok: boolean;
  model?: string;
  mocked: boolean;
  url: string;
};

export function getWhisperBaseUrl(): string {
  return process.env.WHISPER_SIDECAR_URL ?? "http://127.0.0.1:8765";
}

export async function transcribeAudio(
  audio: Blob,
): Promise<WhisperTranscribeResult> {
  if (audio.size === 0) {
    throw new Error("audio file is empty");
  }

  if (isWhisperMockEnabled()) {
    return {
      text: WHISPER_MOCK_TRANSCRIPT,
      language: "en",
      durationMs: 0,
      mocked: true,
    };
  }

  const form = new FormData();
  form.append("audio", audio, "recording.webm");

  const response = await fetch(`${getWhisperBaseUrl()}/v1/transcribe`, {
    method: "POST",
    body: form,
  });

  if (!response.ok) {
    throw new Error(`Whisper transcribe failed: ${response.status}`);
  }

  const payload = (await response.json()) as {
    text: string;
    language?: string;
    durationMs?: number;
  };

  return {
    text: payload.text,
    language: payload.language,
    durationMs: payload.durationMs,
    mocked: false,
  };
}

export async function checkWhisperHealth(): Promise<WhisperHealthResult> {
  const url = getWhisperBaseUrl();

  if (isWhisperMockEnabled()) {
    return { ok: true, model: "mock", mocked: true, url };
  }

  try {
    const response = await fetch(`${url}/health`, {
      signal: AbortSignal.timeout(2000),
    });
    if (!response.ok) {
      return { ok: false, mocked: false, url };
    }
    const payload = (await response.json()) as { ok?: boolean; model?: string };
    return {
      ok: payload.ok === true,
      model: payload.model,
      mocked: false,
      url,
    };
  } catch {
    return { ok: false, mocked: false, url };
  }
}
