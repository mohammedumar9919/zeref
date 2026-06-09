import { randomUUID } from "node:crypto";
import { eq, and, ilike, or } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import {
  MemoryEntrySchema,
  MemoryEntitySchema,
  MemoryRelationSchema,
  type MemoryEntry,
  type MemoryEntity,
  type MemoryRelation,
} from "@zeref/contracts";
import {
  memoryEntries,
  memoryEntities,
  memoryRelations,
  memoryObservations,
  schema,
} from "@zeref/db/schema";
import { ruleBasedContradictionCheck } from "./contradiction.js";
import { autoTierClassifier } from "./tier-classifier.js";
import { temporalScore } from "./temporal-score.js";
import type {
  CreateEntityInput,
  MemoryAdapter,
  QueryEntitiesOptions,
  RelateEntitiesInput,
  SaveMemoryInput,
  SaveMemoryResult,
  SearchMemoryOptions,
  UpdateEntityInput,
  VerifyMemoryInput,
} from "./types.js";

type Db = NodePgDatabase<typeof schema>;

function toIso(date: Date): string {
  return date.toISOString();
}

function rowToEntry(row: typeof memoryEntries.$inferSelect): MemoryEntry {
  return MemoryEntrySchema.parse({
    id: row.id,
    tier: row.tier,
    content: row.content,
    source: row.source,
    entityId: row.entityId,
    valueKey: row.valueKey,
    value: row.value,
    temporalScore: Number(row.temporalScore),
    observation: row.observation,
    metadata: row.metadataJson ?? {},
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  });
}

function rowToEntity(row: typeof memoryEntities.$inferSelect): MemoryEntity {
  return MemoryEntitySchema.parse({
    id: row.id,
    type: row.type,
    name: row.name,
    stateJson: row.stateJson ?? {},
    transitionHistory: row.transitionHistory ?? [],
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  });
}

function rowToRelation(row: typeof memoryRelations.$inferSelect): MemoryRelation {
  return MemoryRelationSchema.parse({
    id: row.id,
    fromEntityId: row.fromEntityId,
    toEntityId: row.toEntityId,
    relationType: row.relationType,
    metadata: row.metadataJson ?? {},
    createdAt: row.createdAt.toISOString(),
  });
}

export class PostgresMemoryAdapter implements MemoryAdapter {
  constructor(private readonly db: Db) {}

  async saveMemory(input: SaveMemoryInput): Promise<SaveMemoryResult> {
    const now = input.createdAt ?? new Date();
    const tier =
      input.tier ??
      autoTierClassifier(input.content, {
        source: input.source,
        entityId: input.entityId ?? undefined,
        snapshotId:
          typeof input.metadata?.snapshotId === "string"
            ? input.metadata.snapshotId
            : undefined,
        metadata: input.metadata,
      });

    const entryId = randomUUID();
    const score = temporalScore(now);

    const draft: MemoryEntry = MemoryEntrySchema.parse({
      id: entryId,
      tier,
      content: input.content,
      source: input.source ?? "system",
      entityId: input.entityId ?? null,
      valueKey: input.valueKey ?? null,
      value: input.value ?? null,
      temporalScore: score,
      observation: "verified",
      metadata: input.metadata ?? {},
      createdAt: toIso(now),
      updatedAt: toIso(now),
    });

    const existingRows = await this.db.select().from(memoryEntries);
    const existing = existingRows.map(rowToEntry);
    const contradictions = ruleBasedContradictionCheck(draft, existing).map((m) => ({
      ...m,
      entryId,
    }));

    await this.db.insert(memoryEntries).values({
      id: entryId,
      tier: draft.tier,
      content: draft.content,
      source: draft.source,
      entityId: draft.entityId,
      valueKey: draft.valueKey,
      value: draft.value,
      temporalScore: String(score),
      observation: draft.observation,
      metadataJson: draft.metadata,
      createdAt: now,
      updatedAt: now,
    });

    for (const match of contradictions) {
      await this.db
        .update(memoryEntries)
        .set({ observation: "contradicted", updatedAt: now })
        .where(eq(memoryEntries.id, match.supersededId));

      await this.db.insert(memoryObservations).values({
        entryId: match.entryId,
        supersededEntryId: match.supersededId,
        observationType: "contradiction",
        metadataJson: {},
        createdAt: now,
      });
    }

    return { entry: draft, contradictions };
  }

  async searchMemory(query: string, options: SearchMemoryOptions = {}) {
    const limit = options.limit ?? 10;
    const now = new Date();
    const trimmed = query.trim();

    let rows = await this.db.select().from(memoryEntries);

    if (!options.includeContradicted) {
      rows = rows.filter((r) => r.observation !== "contradicted");
    }
    if (options.tier) {
      rows = rows.filter((r) => r.tier === options.tier);
    }
    if (trimmed) {
      const pattern = `%${trimmed}%`;
      rows = await this.db
        .select()
        .from(memoryEntries)
        .where(
          and(
            or(
              ilike(memoryEntries.content, pattern),
              ilike(memoryEntries.value, pattern),
            ),
            options.tier ? eq(memoryEntries.tier, options.tier) : undefined,
            !options.includeContradicted
              ? eq(memoryEntries.observation, "verified")
              : undefined,
          ),
        );
    }

    const ranked = rows
      .map((row) => {
        const entry = rowToEntry(row);
        const score = temporalScore(new Date(entry.createdAt), now);
        return { entry: { ...entry, temporalScore: score }, score };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    return {
      query,
      results: ranked.map((item, rank) => ({
        entry: item.entry,
        rank,
        score: item.score,
      })),
      totalCount: ranked.length,
      ts: toIso(now),
    };
  }

  async verifyMemory(input: VerifyMemoryInput): Promise<MemoryEntry> {
    const now = new Date();
    const updated = await this.db
      .update(memoryEntries)
      .set({ observation: input.observation, updatedAt: now })
      .where(eq(memoryEntries.id, input.entryId))
      .returning();

    if (updated.length === 0) {
      throw new Error(`Memory entry not found: ${input.entryId}`);
    }
    return rowToEntry(updated[0]);
  }

  async createEntity(input: CreateEntityInput): Promise<MemoryEntity> {
    const now = new Date();
    const id = randomUUID();
    const inserted = await this.db
      .insert(memoryEntities)
      .values({
        id,
        type: input.type,
        name: input.name,
        stateJson: input.stateJson ?? {},
        transitionHistory: [],
        createdAt: now,
        updatedAt: now,
      })
      .returning();
    return rowToEntity(inserted[0]);
  }

  async updateEntity(input: UpdateEntityInput): Promise<MemoryEntity> {
    const existing = await this.db
      .select()
      .from(memoryEntities)
      .where(eq(memoryEntities.id, input.entityId));
    if (existing.length === 0) {
      throw new Error(`Entity not found: ${input.entityId}`);
    }
    const now = new Date();
    const current = rowToEntity(existing[0]);
    const nextState = { ...current.stateJson, ...input.patch };
    const history = [
      ...current.transitionHistory,
      { ts: toIso(now), patch: input.patch },
    ];
    const updated = await this.db
      .update(memoryEntities)
      .set({
        stateJson: nextState,
        transitionHistory: history,
        updatedAt: now,
      })
      .where(eq(memoryEntities.id, input.entityId))
      .returning();
    return rowToEntity(updated[0]);
  }

  async queryEntities(options: QueryEntitiesOptions = {}): Promise<MemoryEntity[]> {
    let rows = await this.db.select().from(memoryEntities);
    if (options.type) {
      rows = rows.filter((r) => r.type === options.type);
    }
    if (options.name) {
      rows = rows.filter((r) => r.name === options.name);
    }
    const limit = options.limit ?? rows.length;
    return rows.slice(0, limit).map(rowToEntity);
  }

  async relateEntities(input: RelateEntitiesInput): Promise<MemoryRelation> {
    const now = new Date();
    const id = randomUUID();
    const inserted = await this.db
      .insert(memoryRelations)
      .values({
        id,
        fromEntityId: input.fromEntityId,
        toEntityId: input.toEntityId,
        relationType: input.relationType,
        metadataJson: input.metadata ?? {},
        createdAt: now,
      })
      .returning();
    return rowToRelation(inserted[0]);
  }
}

export function createPostgresMemoryAdapter(db: Db): PostgresMemoryAdapter {
  return new PostgresMemoryAdapter(db);
}
