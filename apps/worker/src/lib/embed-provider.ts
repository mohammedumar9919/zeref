import { createHash } from "node:crypto";
import { EMBEDDING_DIMENSIONS } from "@zeref/db";

export type EmbedProviderResult = {
  embedding: number[];
  dimensions: typeof EMBEDDING_DIMENSIONS;
  model: string;
};

/**
 * Deterministic mock embedding for CI and local default (ADR-007).
 * Same text → same 1536-d vector; no network.
 */
export function mockEmbedVector(text: string, dimensions = EMBEDDING_DIMENSIONS): number[] {
  const vec: number[] = [];
  let round = 0;
  while (vec.length < dimensions) {
    const digest = createHash("sha256").update(`${text}\0${round}`).digest();
    for (const byte of digest) {
      vec.push(byte / 127.5 - 1);
      if (vec.length >= dimensions) break;
    }
    round += 1;
  }
  return vec;
}

export function embedContentHash(text: string, model: string): string {
  const digest = createHash("sha256").update(`${model}\0${text}`).digest("hex");
  return `sha256:${digest}`;
}

/** Resolve embed provider from env (mock default; nomic optional for dev). */
export async function embedText(
  text: string,
  model: string,
): Promise<EmbedProviderResult> {
  const provider = process.env.ZEREF_EMBED_PROVIDER ?? "mock";

  if (provider === "nomic") {
    const url = process.env.ZEREF_NOMIC_EMBED_URL;
    if (!url) {
      throw new Error("ZEREF_NOMIC_EMBED_URL required when ZEREF_EMBED_PROVIDER=nomic");
    }
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ text, model }),
    });
    if (!res.ok) {
      throw new Error(`nomic embed failed: ${res.status} ${(await res.text()).slice(0, 200)}`);
    }
    const body = (await res.json()) as { embedding: number[] };
    if (body.embedding.length !== EMBEDDING_DIMENSIONS) {
      throw new Error(
        `nomic embedding dimension ${body.embedding.length} !== ${EMBEDDING_DIMENSIONS}`,
      );
    }
    return { embedding: body.embedding, dimensions: EMBEDDING_DIMENSIONS, model };
  }

  if (provider === "openai") {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY required when ZEREF_EMBED_PROVIDER=openai");
    }
    const res = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: {
        authorization: `Bearer ${apiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ input: text, model }),
    });
    if (!res.ok) {
      throw new Error(`openai embed failed: ${res.status} ${(await res.text()).slice(0, 200)}`);
    }
    const body = (await res.json()) as { data: Array<{ embedding: number[] }> };
    const embedding = body.data[0]?.embedding;
    if (!embedding || embedding.length !== EMBEDDING_DIMENSIONS) {
      throw new Error("openai embedding missing or wrong dimensions");
    }
    return { embedding, dimensions: EMBEDDING_DIMENSIONS, model };
  }

  return {
    embedding: mockEmbedVector(text),
    dimensions: EMBEDDING_DIMENSIONS,
    model,
  };
}
