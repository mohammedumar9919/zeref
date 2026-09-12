/**
 * Portable sentence splitter for cascaded voice (CLOUD-A4).
 * Tokens accumulate until `.`, `!`, or `?` plus whitespace/end.
 */

const SENTENCE_END = /[.!?](?:\s+|$)/g;

export type SentenceBuffer = {
  push(delta: string): string[];
  flush(): string[];
  pending(): string;
};

export function createSentenceBuffer(): SentenceBuffer {
  let buf = "";

  const takeReady = (): string[] => {
    const ready: string[] = [];
    SENTENCE_END.lastIndex = 0;
    let last = 0;
    let match: RegExpExecArray | null;
    while ((match = SENTENCE_END.exec(buf)) !== null) {
      const end = match.index + match[0].length;
      const sentence = buf.slice(last, end).trim();
      if (sentence.length > 0) {
        ready.push(sentence);
      }
      last = end;
    }
    buf = buf.slice(last);
    return ready;
  };

  return {
    push(delta: string): string[] {
      if (!delta) return [];
      buf += delta;
      return takeReady();
    },
    flush(): string[] {
      const rest = buf.trim();
      buf = "";
      return rest.length > 0 ? [rest] : [];
    },
    pending(): string {
      return buf;
    },
  };
}

/** Split a finished string into speakable sentences (flush remainder). */
export function splitIntoSentences(text: string): string[] {
  const buffer = createSentenceBuffer();
  const ready = buffer.push(text);
  return [...ready, ...buffer.flush()];
}
