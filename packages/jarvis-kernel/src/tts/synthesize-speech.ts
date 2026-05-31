import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { SpeechSynthesisOptions, SpeechSynthesisResult, TtsAdapter } from "../types.js";

const pkgRoot = join(dirname(fileURLToPath(import.meta.url)), "../..");
const repoRoot = join(pkgRoot, "../..");
const MOCK_WAV_PATH = join(repoRoot, "fixtures/phase-6/tts-mock.wav");

function estimateDurationMs(text: string): number {
  return Math.max(250, Math.min(8000, text.trim().split(/\s+/).length * 180));
}

function loadMockWav(): Buffer {
  return readFileSync(MOCK_WAV_PATH);
}

export async function synthesizeWithMock(
  text: string,
): Promise<SpeechSynthesisResult> {
  return {
    audio: loadMockWav(),
    mimeType: "audio/wav",
    provider: "mock",
    mocked: true,
    durationMs: estimateDurationMs(text),
  };
}

export async function synthesizeWithElevenLabs(
  text: string,
): Promise<SpeechSynthesisResult> {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  const voiceId = process.env.ELEVENLABS_VOICE_ID;
  if (!apiKey || !voiceId) {
    throw new Error("ElevenLabs credentials missing");
  }

  const response = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
    {
      method: "POST",
      headers: {
        "xi-api-key": apiKey,
        "Content-Type": "application/json",
        Accept: "audio/mpeg",
      },
      body: JSON.stringify({
        text,
        model_id: "eleven_multilingual_v2",
      }),
    },
  );

  if (!response.ok) {
    throw new Error(`ElevenLabs request failed: ${response.status}`);
  }

  const audio = Buffer.from(await response.arrayBuffer());
  return {
    audio,
    mimeType: "audio/mpeg",
    provider: "elevenlabs",
    mocked: false,
    durationMs: estimateDurationMs(text),
  };
}

export async function synthesizeWithOpenAi(
  text: string,
): Promise<SpeechSynthesisResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OpenAI API key missing");
  }

  const response = await fetch("https://api.openai.com/v1/audio/speech", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "tts-1",
      voice: "fable",
      input: text,
      response_format: "wav",
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI TTS request failed: ${response.status}`);
  }

  const audio = Buffer.from(await response.arrayBuffer());
  return {
    audio,
    mimeType: "audio/wav",
    provider: "openai",
    mocked: false,
    durationMs: estimateDurationMs(text),
  };
}

export const defaultTtsAdapter: TtsAdapter = async (
  text: string,
  _opts?: SpeechSynthesisOptions,
) => {
  if (process.env.ZEREF_TTS_MOCK === "1") {
    return synthesizeWithMock(text);
  }

  try {
    return await synthesizeWithElevenLabs(text);
  } catch (primaryError) {
    console.warn(
      `[jarvis-kernel] ElevenLabs TTS failed, falling back to OpenAI: ${
        primaryError instanceof Error ? primaryError.message : primaryError
      }`,
    );
    return synthesizeWithOpenAi(text);
  }
};

export type { SpeechSynthesisOptions, SpeechSynthesisResult };
