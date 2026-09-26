import { spawn } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { readFileSync } from "node:fs";
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
    const detail = await response.text().catch(() => "");
    throw new Error(
      `ElevenLabs request failed: ${response.status}${detail ? ` — ${detail.slice(0, 180)}` : ""}`,
    );
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

function runPowerShell(script: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(
      "powershell.exe",
      ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-Command", script],
      { windowsHide: true },
    );
    let stderr = "";
    child.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString("utf8");
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`Windows SAPI failed (exit ${code}): ${stderr.slice(0, 240)}`));
    });
  });
}

/** Local spoken fallback via Windows System.Speech (no cloud quota). */
export async function synthesizeWithWindowsSapi(
  text: string,
): Promise<SpeechSynthesisResult> {
  if (process.platform !== "win32") {
    throw new Error("Windows SAPI unavailable on this platform");
  }
  if (process.env.ZEREF_TTS_DISABLE_SAPI === "1") {
    throw new Error("Windows SAPI disabled via ZEREF_TTS_DISABLE_SAPI");
  }

  const trimmed = text.trim().slice(0, 900);
  if (!trimmed) {
    throw new Error("empty TTS text");
  }

  const dir = await mkdtemp(join(tmpdir(), "zeref-tts-"));
  const wavPath = join(dir, "out.wav");
  const psWav = wavPath.replace(/'/g, "''");
  const psText = trimmed.replace(/'/g, "''");

  try {
    await runPowerShell(
      [
        "Add-Type -AssemblyName System.Speech",
        "$s = New-Object System.Speech.Synthesis.SpeechSynthesizer",
        "$s.Rate = 0",
        `$s.SetOutputToWaveFile('${psWav}')`,
        `$s.Speak('${psText}')`,
        "$s.Dispose()",
      ].join("; "),
    );
    const audio = await readFile(wavPath);
    if (audio.length < 44) {
      throw new Error("Windows SAPI produced empty wav");
    }
    return {
      audio,
      mimeType: "audio/wav",
      provider: "windows-sapi",
      mocked: false,
      durationMs: estimateDurationMs(trimmed),
    };
  } finally {
    await rm(dir, { recursive: true, force: true }).catch(() => undefined);
  }
}

export const defaultTtsAdapter: TtsAdapter = async (
  text: string,
  opts?: SpeechSynthesisOptions,
) => {
  if (process.env.ZEREF_TTS_MOCK === "1") {
    return synthesizeWithMock(text);
  }

  try {
    return await synthesizeWithElevenLabs(text);
  } catch (primaryError) {
    console.warn(
      `[jarvis-kernel] ElevenLabs TTS failed, falling back: ${
        primaryError instanceof Error ? primaryError.message : primaryError
      }`,
    );
  }

  try {
    return await synthesizeWithOpenAi(text);
  } catch (openAiError) {
    console.warn(
      `[jarvis-kernel] OpenAI TTS failed, trying Windows SAPI: ${
        openAiError instanceof Error ? openAiError.message : openAiError
      }`,
    );
  }

  try {
    return await synthesizeWithWindowsSapi(text);
  } catch (sapiError) {
    console.warn(
      `[jarvis-kernel] Windows SAPI failed, falling back to mock wav: ${
        sapiError instanceof Error ? sapiError.message : sapiError
      }`,
    );
    // Last resort — beep. Callers should skip ack audio when mocked.
    void opts;
    return synthesizeWithMock(text);
  }
};

export type { SpeechSynthesisOptions, SpeechSynthesisResult };
