import {
  MetricFactIdSchema,
  NormalizeJobInputSchema,
  NormalizeJobOutputSchema,
  type NormalizeJobOutput,
  type NormalizedEntityId,
  type PlatformAccountId,
} from "@zeref/contracts";
import { computeMetricFacts } from "@zeref/analytics";
import {
  metricFacts,
  normalizedEntities,
  schema,
  snapshots,
} from "@zeref/db";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import type { Pool } from "pg";
import { isAutoEmbedEnabled } from "../lib/auto-embed.js";
import {
  buildNormalizedPostPayload,
  parseMergedSnapshotPayload,
} from "../lib/normalize-payload.js";
import { runEmbed, type EmbedHandlerDeps } from "./embed.js";

export type NormalizeHandlerDeps = EmbedHandlerDeps & {
  pool: Pool;
  /** When false, skips inline embed even if ZEREF_AUTO_EMBED is set. */
  autoEmbed?: boolean;
};

/**
 * Normalize handler: snapshot by ID → analytics → normalized_entities + metric_facts (C14).
 * Does not import @zeref/instagram (ADR-009).
 */
export async function runNormalize(
  rawInput: unknown,
  deps: NormalizeHandlerDeps,
): Promise<NormalizeJobOutput> {
  const input = NormalizeJobInputSchema.parse(rawInput);
  const db = drizzle(deps.pool, { schema });

  const snapshotRows = await db
    .select()
    .from(snapshots)
    .where(eq(snapshots.id, input.snapshotId))
    .limit(1);

  const snapshot = snapshotRows[0];
  if (!snapshot) {
    throw new Error(`snapshot not found: ${input.snapshotId}`);
  }

  if (snapshot.kind !== "instagram_post_raw") {
    throw new Error(
      `normalize supports instagram_post_raw only in Phase 3 (got ${snapshot.kind})`,
    );
  }

  const merged = parseMergedSnapshotPayload(snapshot.payloadJson);
  const normalizedPayload = buildNormalizedPostPayload(
    merged,
    input.schemaVersion,
    snapshot.platformAccountId ?? undefined,
  );
  const metrics = computeMetricFacts({ merged });

  const entityRows = await db
    .insert(normalizedEntities)
    .values({
      snapshotId: snapshot.id,
      schemaVersion: input.schemaVersion,
      payloadJson: normalizedPayload,
    })
    .returning({ id: normalizedEntities.id });

  const entity = entityRows[0];
  if (!entity) {
    throw new Error("normalized_entities INSERT returned no row");
  }

  let metricFactId: string | undefined;
  let insufficientData = metrics.insufficientData;
  const platformAccountId = snapshot.platformAccountId;

  if (!platformAccountId) {
    insufficientData = true;
  } else {
    const factRows = await db
      .insert(metricFacts)
      .values({
        snapshotId: snapshot.id,
        normalizedEntityId: entity.id,
        platformAccountId,
        metricVersion: metrics.metricVersion,
        engagementScore:
          metrics.engagementScore != null ? String(metrics.engagementScore) : null,
        nicheTags: metrics.nicheTags,
        insufficientData: metrics.insufficientData,
        factsJson: metrics.factsJson,
      })
      .returning({ id: metricFacts.id });

    metricFactId = factRows[0]?.id;
  }

  const output = NormalizeJobOutputSchema.parse({
    normalizedEntityId: entity.id as NormalizedEntityId,
    snapshotId: input.snapshotId,
    ...(metricFactId ? { metricFactId: MetricFactIdSchema.parse(metricFactId) } : {}),
    insufficientData,
    ...(platformAccountId
      ? { platformAccountId: platformAccountId as PlatformAccountId }
      : {}),
  });

  const shouldAutoEmbed = deps.autoEmbed !== false && isAutoEmbedEnabled();
  if (shouldAutoEmbed) {
    await runEmbed(
      {
        jobType: "embed",
        normalizedEntityId: entity.id,
        model: deps.embedModel,
        schemaVersion: input.schemaVersion,
      },
      deps,
    );
  }

  return output;
}

export function createNormalizeHandler(deps: NormalizeHandlerDeps) {
  return async (job: { data: unknown }): Promise<NormalizeJobOutput> =>
    runNormalize(job.data, deps);
}
