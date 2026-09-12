import { createSentenceBuffer } from "./sentence-buffer.js";

/** First-audio target for cascaded TTS. Laptop UAT must measure — do not claim without a mic run. */
export const FIRST_AUDIO_TARGET_MS = 1200;

export type CascadeChunk<T> = {
  sentence: string;
  index: number;
  audio: T;
  elapsedMs: number;
};

export type TokenToTtsCascadeInput<T> = {
  tokens: Iterable<string> | AsyncIterable<string>;
  synthesize: (sentence: string) => Promise<T>;
  onChunk?: (chunk: CascadeChunk<T>) => void | Promise<void>;
  killSignal?: AbortSignal;
  now?: () => number;
};

export type TokenToTtsCascadeResult<T> = {
  sentences: string[];
  chunks: CascadeChunk<T>[];
  firstAudioMs: number | null;
  aborted: boolean;
  firstAudioTargetMs: typeof FIRST_AUDIO_TARGET_MS;
};

async function iterateTokens(
  tokens: Iterable<string> | AsyncIterable<string>,
): Promise<string[]> {
  const out: string[] = [];
  const iterator = tokens as AsyncIterable<string> & Iterable<string>;
  if (typeof iterator[Symbol.asyncIterator] === "function") {
    for await (const token of iterator) {
      out.push(token);
    }
    return out;
  }
  for (const token of iterator) {
    out.push(token);
  }
  return out;
}

/**
 * Cascaded streaming: LLM tokens → sentence buffer → TTS per sentence.
 * First chunk is synthesized as soon as the first sentence boundary lands.
 */
export async function runTokenToTtsCascade<T>(
  input: TokenToTtsCascadeInput<T>,
): Promise<TokenToTtsCascadeResult<T>> {
  const now = input.now ?? Date.now;
  const started = now();
  const buffer = createSentenceBuffer();
  const sentences: string[] = [];
  const chunks: CascadeChunk<T>[] = [];
  let firstAudioMs: number | null = null;
  let aborted = false;

  const speak = async (sentence: string): Promise<boolean> => {
    if (input.killSignal?.aborted) {
      aborted = true;
      return false;
    }
    const audio = await input.synthesize(sentence);
    if (input.killSignal?.aborted) {
      aborted = true;
      return false;
    }
    const elapsedMs = now() - started;
    if (firstAudioMs === null) {
      firstAudioMs = elapsedMs;
    }
    const chunk: CascadeChunk<T> = {
      sentence,
      index: chunks.length,
      audio,
      elapsedMs,
    };
    chunks.push(chunk);
    sentences.push(sentence);
    await input.onChunk?.(chunk);
    return true;
  };

  const tokens = await iterateTokens(input.tokens);
  for (const token of tokens) {
    if (input.killSignal?.aborted) {
      aborted = true;
      break;
    }
    for (const sentence of buffer.push(token)) {
      const ok = await speak(sentence);
      if (!ok) break;
    }
    if (aborted) break;
  }

  if (!aborted) {
    for (const sentence of buffer.flush()) {
      const ok = await speak(sentence);
      if (!ok) break;
    }
  }

  return {
    sentences,
    chunks,
    firstAudioMs,
    aborted,
    firstAudioTargetMs: FIRST_AUDIO_TARGET_MS,
  };
}
