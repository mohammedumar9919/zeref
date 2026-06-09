import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  MemoryEntrySchema,
  MemoryEntitySchema,
  MemoryRelationSchema,
  type MemoryEntry,
  type MemoryEntity,
  type MemoryRelation,
} from "@zeref/contracts";
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

const pkgRoot = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(pkgRoot, "../../..");
const fixturePath = join(repoRoot, "fixtures/phase-7/mock-store.json");

type MockStore = {
  entries: MemoryEntry[];
  entities: MemoryEntity[];
  relations: MemoryRelation[];
};

function loadFixtureStore(): MockStore {
  const raw = JSON.parse(readFileSync(fixturePath, "utf8")) as MockStore;
  return {
    entries: raw.entries.map((e) => MemoryEntrySchema.parse(e)),
    entities: raw.entities.map((e) => MemoryEntitySchema.parse(e)),
    relations: (raw.relations ?? []).map((r) => MemoryRelationSchema.parse(r)),
  };
}

function toIso(date: Date): string {
  return date.toISOString();
}

function entryMatchesQuery(entry: MemoryEntry, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) {
    return true;
  }
  return (
    entry.content.toLowerCase().includes(q) ||
    (entry.value?.toLowerCase().includes(q) ?? false) ||
    Object.values(entry.metadata).some(
      (v) => typeof v === "string" && v.toLowerCase().includes(q),
    )
  );
}

export class MockMemoryAdapter implements MemoryAdapter {
  private store: MockStore;

  constructor(seedFromFixture = true) {
    this.store = seedFromFixture
      ? loadFixtureStore()
      : { entries: [], entities: [], relations: [] };
  }

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
    const draft: MemoryEntry = MemoryEntrySchema.parse({
      id: entryId,
      tier,
      content: input.content,
      source: input.source ?? "system",
      entityId: input.entityId ?? null,
      valueKey: input.valueKey ?? null,
      value: input.value ?? null,
      temporalScore: temporalScore(now),
      observation: "verified",
      metadata: input.metadata ?? {},
      createdAt: toIso(now),
      updatedAt: toIso(now),
    });

    const contradictions = ruleBasedContradictionCheck(draft, this.store.entries).map(
      (match) => ({
        ...match,
        entryId: entryId,
      }),
    );

    for (const match of contradictions) {
      const idx = this.store.entries.findIndex((e) => e.id === match.supersededId);
      if (idx >= 0) {
        this.store.entries[idx] = {
          ...this.store.entries[idx],
          observation: "contradicted",
          updatedAt: toIso(now),
        };
      }
    }

    this.store.entries.push(draft);

    return { entry: draft, contradictions };
  }

  async searchMemory(
    query: string,
    options: SearchMemoryOptions = {},
  ): Promise<import("@zeref/contracts").MemorySearchResult> {
    const limit = options.limit ?? 10;
    const includeContradicted = options.includeContradicted ?? false;
    const now = new Date();

    const filtered = this.store.entries.filter((entry) => {
      if (!includeContradicted && entry.observation === "contradicted") {
        return false;
      }
      if (options.tier && entry.tier !== options.tier) {
        return false;
      }
      return entryMatchesQuery(entry, query);
    });

    const ranked = filtered
      .map((entry) => {
        const createdAt = new Date(entry.createdAt);
        const score = temporalScore(createdAt, now);
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
    const idx = this.store.entries.findIndex((e) => e.id === input.entryId);
    if (idx < 0) {
      throw new Error(`Memory entry not found: ${input.entryId}`);
    }
    const updated = {
      ...this.store.entries[idx],
      observation: input.observation,
      updatedAt: toIso(new Date()),
    };
    this.store.entries[idx] = MemoryEntrySchema.parse(updated);
    return this.store.entries[idx];
  }

  async createEntity(input: CreateEntityInput): Promise<MemoryEntity> {
    const now = toIso(new Date());
    const entity = MemoryEntitySchema.parse({
      id: randomUUID(),
      type: input.type,
      name: input.name,
      stateJson: input.stateJson ?? {},
      transitionHistory: [],
      createdAt: now,
      updatedAt: now,
    });
    this.store.entities.push(entity);
    return entity;
  }

  async updateEntity(input: UpdateEntityInput): Promise<MemoryEntity> {
    const idx = this.store.entities.findIndex((e) => e.id === input.entityId);
    if (idx < 0) {
      throw new Error(`Entity not found: ${input.entityId}`);
    }
    const now = toIso(new Date());
    const current = this.store.entities[idx];
    const nextState = { ...current.stateJson, ...input.patch };
    const updated = MemoryEntitySchema.parse({
      ...current,
      stateJson: nextState,
      transitionHistory: [
        ...current.transitionHistory,
        { ts: now, patch: input.patch },
      ],
      updatedAt: now,
    });
    this.store.entities[idx] = updated;
    return updated;
  }

  async queryEntities(options: QueryEntitiesOptions = {}): Promise<MemoryEntity[]> {
    let results = [...this.store.entities];
    if (options.type) {
      results = results.filter((e) => e.type === options.type);
    }
    if (options.name) {
      results = results.filter((e) => e.name === options.name);
    }
    const limit = options.limit ?? results.length;
    return results.slice(0, limit);
  }

  async relateEntities(input: RelateEntitiesInput): Promise<MemoryRelation> {
    const relation = MemoryRelationSchema.parse({
      id: randomUUID(),
      fromEntityId: input.fromEntityId,
      toEntityId: input.toEntityId,
      relationType: input.relationType,
      metadata: input.metadata ?? {},
      createdAt: toIso(new Date()),
    });
    this.store.relations.push(relation);
    return relation;
  }
}

export function createMockMemoryAdapter(): MockMemoryAdapter {
  return new MockMemoryAdapter(true);
}
