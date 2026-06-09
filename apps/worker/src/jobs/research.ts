import {
  ResearchJobInputSchema,
  ResearchJobOutputSchema,
  type ResearchJobOutput,
  type ResearchTopicId,
} from "@zeref/contracts";
import {
  aggregateTrendScore,
  buildResearchSignalCandidates,
} from "@zeref/analytics";
import {
  embeddingVectors,
  metricFacts,
  researchSignals,
  researchTopics,
  schema,
} from "@zeref/db";
import { eq, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import type { Pool } from "pg";

export type ResearchHandlerDeps = {
  pool: Pool;
};

/**
 * Research handler: reads metric_facts + embedding_vectors; writes signals + topic aggregates (C83).
 * No snapshot mutation; no @zeref/instagram.
 */
export async function runResearch(
  rawInput: unknown,
  deps: ResearchHandlerDeps,
): Promise<ResearchJobOutput> {
  const input = ResearchJobInputSchema.parse(rawInput);
  const db = drizzle(deps.pool, { schema });

  const topicRows = input.topicId
    ? await db
        .select()
        .from(researchTopics)
        .where(eq(researchTopics.id, input.topicId))
    : await db.select().from(researchTopics);

  if (topicRows.length === 0) {
    throw new Error(
      input.topicId
        ? `research topic not found: ${input.topicId}`
        : "no research topics to compute",
    );
  }

  const outputs: ResearchJobOutput[] = [];

  for (const topic of topicRows) {
    const scopeEntityId = topic.scopeEntityId ?? undefined;

    const factQuery = scopeEntityId
      ? db
          .select({
            id: metricFacts.id,
            normalizedEntityId: metricFacts.normalizedEntityId,
            snapshotId: metricFacts.snapshotId,
            engagementScore: metricFacts.engagementScore,
            insufficientData: metricFacts.insufficientData,
          })
          .from(metricFacts)
          .where(eq(metricFacts.normalizedEntityId, scopeEntityId))
      : db
          .select({
            id: metricFacts.id,
            normalizedEntityId: metricFacts.normalizedEntityId,
            snapshotId: metricFacts.snapshotId,
            engagementScore: metricFacts.engagementScore,
            insufficientData: metricFacts.insufficientData,
          })
          .from(metricFacts);

    const factRows = await factQuery;

    const entityIds = scopeEntityId
      ? [scopeEntityId]
      : [...new Set(factRows.map((f) => f.normalizedEntityId))];

    const embedRows =
      entityIds.length > 0
        ? await db
            .select({
              id: embeddingVectors.id,
              normalizedEntityId: embeddingVectors.normalizedEntityId,
              model: embeddingVectors.model,
            })
            .from(embeddingVectors)
            .where(inArray(embeddingVectors.normalizedEntityId, entityIds))
        : [];

    const candidates = buildResearchSignalCandidates({
      metricFacts: factRows.map((f) => ({
        id: f.id,
        normalizedEntityId: f.normalizedEntityId,
        snapshotId: f.snapshotId,
        engagementScore:
          f.engagementScore != null ? Number(f.engagementScore) : null,
        insufficientData: f.insufficientData,
      })),
      embeddings: embedRows.map((e) => ({
        id: e.id,
        normalizedEntityId: e.normalizedEntityId,
        model: e.model,
      })),
      scopeEntityId,
    });

    await db
      .delete(researchSignals)
      .where(eq(researchSignals.topicId, topic.id));

    const computedAt = new Date();
    if (candidates.length > 0) {
      await db.insert(researchSignals).values(
        candidates.map((c) => ({
          topicId: topic.id,
          sourceEntityId: c.sourceEntityId ?? null,
          sourceSnapshotId: c.sourceSnapshotId ?? null,
          signalType: c.signalType,
          score: String(c.score),
          payloadJson: c.payloadJson,
          computedAt,
        })),
      );
    }

    const trendScore = aggregateTrendScore(candidates);
    const signalCount = candidates.length;

    await db
      .update(researchTopics)
      .set({
        trendScore: trendScore != null ? String(trendScore) : null,
        signalCount,
        lastComputedAt: computedAt,
        updatedAt: computedAt,
      })
      .where(eq(researchTopics.id, topic.id));

    outputs.push(
      ResearchJobOutputSchema.parse({
        topicId: topic.id as ResearchTopicId,
        signalsWritten: signalCount,
        signalCount,
        trendScore,
        lastComputedAt: computedAt.toISOString(),
      }),
    );
  }

  if (input.topicId) {
    const match = outputs.find((o) => o.topicId === input.topicId);
    if (!match) {
      throw new Error(`research job did not process topic: ${input.topicId}`);
    }
    return match;
  }

  return outputs[0]!;
}

export function createResearchHandler(deps: ResearchHandlerDeps) {
  return async (job: { data: unknown }): Promise<ResearchJobOutput> =>
    runResearch(job.data, deps);
}
