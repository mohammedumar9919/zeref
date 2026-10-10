import { CollectJobInputSchema, type CollectJobInput, type CollectJobOutput } from "@zeref/contracts";
import { schema } from "@zeref/db";
import { drizzle } from "drizzle-orm/node-postgres";
import type { Pool } from "pg";
import { computeContentHash } from "../lib/content-hash.js";
import {
  collectMergedPosts,
  collectProfilePayload,
  postSourceRef,
  type CollectPipelineDeps,
} from "../lib/collect-pipeline.js";
import { findExistingSnapshot, insertSnapshot } from "../lib/snapshot-store.js";

export type CollectHandlerDeps = CollectPipelineDeps & {
  pool: Pool;
};

async function persistSnapshot(
  db: ReturnType<typeof drizzle<typeof schema>>,
  input: CollectJobInput,
  sourceRef: string,
  payload: unknown,
  shortcode?: string,
): Promise<CollectJobOutput> {
  const contentHash = computeContentHash(payload);
  const existing = await findExistingSnapshot(db, {
    platformAccountId: input.platformAccountId ?? null,
    platform: input.platform,
    kind: input.kind,
    contentHash,
  });
  if (existing) {
    return shortcode ? { ...existing, shortcode } : existing;
  }

  const inserted = await insertSnapshot(db, {
    platformAccountId: input.platformAccountId ?? null,
    platform: input.platform,
    kind: input.kind,
    sourceRef,
    contentHash,
    payloadJson: payload,
    collectedAt: new Date(),
  });
  return shortcode ? { ...inserted, shortcode } : inserted;
}

export type PersistedCollectOutput = CollectJobOutput & { sourceRef: string };

/** Collect + persist every snapshot for the input (one per post, or one profile). */
export async function collectAndPersistAll(
  rawInput: unknown,
  deps: CollectHandlerDeps,
): Promise<{ input: CollectJobInput; outputs: PersistedCollectOutput[] }> {
  const input = CollectJobInputSchema.parse(rawInput);
  const db = drizzle(deps.pool, { schema });

  if (input.kind === "instagram_profile_raw") {
    const { sourceRef, payload } = await collectProfilePayload(input, deps);
    const out = await persistSnapshot(db, input, sourceRef, payload);
    return { input, outputs: [{ ...out, sourceRef }] };
  }

  const merged = await collectMergedPosts(input, deps);
  if (merged.length === 0) {
    throw new Error("collect produced no merged posts for requested shortcodes");
  }

  const outputs: PersistedCollectOutput[] = [];
  for (const row of merged) {
    const sourceRef = postSourceRef(row.shortcode);
    const out = await persistSnapshot(db, input, sourceRef, row, row.shortcode);
    outputs.push({ ...out, sourceRef });
  }
  return { input, outputs };
}

/**
 * Collect handler: validate input → @zeref/instagram → INSERT snapshot → output (C7).
 * Re-collect with identical hash returns existing snapshot id (C8 / ADR-005).
 */
export async function runCollect(
  rawInput: unknown,
  deps: CollectHandlerDeps,
): Promise<CollectJobOutput> {
  const { input, outputs } = await collectAndPersistAll(rawInput, deps);
  if (input.kind === "instagram_profile_raw") {
    const { sourceRef: _sourceRef, ...out } = outputs[0]!;
    return out;
  }

  const primaryShortcode = input.shortcodes?.[0];
  const primaryOut =
    (primaryShortcode
      ? outputs.find(
          (o) =>
            o.shortcode === primaryShortcode ||
            o.shortcode?.startsWith(primaryShortcode),
        )
      : undefined) ?? outputs[0];
  if (!primaryOut) {
    throw new Error("collect failed to persist any snapshots");
  }
  const { sourceRef: _sourceRef, ...out } = primaryOut;
  return out;
}

export function createCollectHandler(deps: CollectHandlerDeps) {
  return async (job: { data: unknown }): Promise<CollectJobOutput> =>
    runCollect(job.data, deps);
}
