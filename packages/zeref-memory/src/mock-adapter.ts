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
  type VaultForgetResult,
  type VaultItem,
} from "@zeref/contracts";
import { checkContradictions, suspectedMetadata } from "./contradiction.js";
import {
  chainOrder,
  collectChainIds,
  isStaleArchiveCandidate,
  oldestFirst,
  staleArchiveWindow,
  supersedeDraft,
  supersedeRefusal,
  type EntryLifecycle,
} from "./lifecycle.js";
import { isVaultEntry, selectVaultItems, toVaultItem, toVaultSaveInput } from "./vault.js";
import { autoTierClassifier } from "./tier-classifier.js";
import { temporalScore } from "./temporal-score.js";
import type {
  ArchiveEntriesResult,
  CreateEntityInput,
  ListVaultItemsOptions,
  MemoryAdapter,
  MemoryLifecycleEntry,
  ProposeStaleArchiveOptions,
  QueryEntitiesOptions,
  RelateEntitiesInput,
  SaveMemoryInput,
  SaveMemoryResult,
  SaveVaultItemInput,
  SearchMemoryOptions,
  SupersedeEntryInput,
  SupersedeEntryResult,
  UpdateEntityInput,
  VerifyMemoryInput,
} from "./types.js";

const NO_LIFECYCLE: EntryLifecycle = { supersededBy: null, archivedAt: null };

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
  /** `superseded_by` / `archived_at` live beside the strict `MemoryEntry` contract. */
  private lifecycle = new Map<string, EntryLifecycle>();

  constructor(seedFromFixture = true) {
    this.store = seedFromFixture
      ? loadFixtureStore()
      : { entries: [], entities: [], relations: [] };
  }

  private lifecycleOf(id: string): EntryLifecycle {
    return this.lifecycle.get(id) ?? NO_LIFECYCLE;
  }

  private setLifecycle(id: string, patch: Partial<EntryLifecycle>): void {
    this.lifecycle.set(id, { ...this.lifecycleOf(id), ...patch });
  }

  private withLifecycle(entry: MemoryEntry): MemoryLifecycleEntry {
    return { ...entry, ...this.lifecycleOf(entry.id) };
  }

  private markSuperseded(oldId: string, newId: string, now: Date): void {
    const idx = this.store.entries.findIndex((e) => e.id === oldId);
    if (idx < 0) return;
    this.store.entries[idx] = {
      ...this.store.entries[idx],
      observation: "contradicted",
      updatedAt: toIso(now),
    };
    this.setLifecycle(oldId, { supersededBy: newId });
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

    const { exact, suspected } = checkContradictions(draft, this.store.entries);
    const contradictions = exact.map((match) => ({
      ...match,
      entryId: entryId,
    }));
    draft.metadata = suspectedMetadata(draft.metadata, suspected);

    this.store.entries.push(draft);
    for (const match of contradictions) {
      this.markSuperseded(match.supersededId, entryId, now);
    }

    return { entry: draft, contradictions };
  }

  async supersedeEntry(oldId: string, input: SupersedeEntryInput): Promise<SupersedeEntryResult> {
    const oldEntry = this.store.entries.find((e) => e.id === oldId);
    const old = oldEntry ? this.withLifecycle(oldEntry) : undefined;
    const refusal = supersedeRefusal(oldId, old);
    if (refusal || !oldEntry) {
      throw new Error(refusal ?? `Memory entry not found: ${oldId}`);
    }

    const now = new Date();
    const entry = MemoryEntrySchema.parse({
      ...supersedeDraft(oldEntry, input),
      id: randomUUID(),
      temporalScore: temporalScore(now),
      observation: "verified",
      createdAt: toIso(now),
      updatedAt: toIso(now),
    });
    this.store.entries.push(entry);
    this.markSuperseded(oldId, entry.id, now);
    return { entry, supersededId: oldId };
  }

  async archiveEntries(ids: string[]): Promise<ArchiveEntriesResult> {
    const result: ArchiveEntriesResult = { archived: [], alreadyArchived: [], notFound: [] };
    const archivedAt = toIso(new Date());
    for (const id of new Set(ids)) {
      if (!this.store.entries.some((e) => e.id === id)) {
        result.notFound.push(id);
      } else if (this.lifecycleOf(id).archivedAt) {
        result.alreadyArchived.push(id);
      } else {
        this.setLifecycle(id, { archivedAt });
        result.archived.push(id);
      }
    }
    return result;
  }

  async proposeStaleArchive(options: ProposeStaleArchiveOptions = {}): Promise<MemoryEntry[]> {
    const { cutoff, limit } = staleArchiveWindow(options);
    return this.store.entries
      .filter((e) => isStaleArchiveCandidate(e, this.lifecycleOf(e.id), cutoff))
      .sort(oldestFirst)
      .slice(0, limit);
  }

  async getEntryHistory(id: string): Promise<MemoryLifecycleEntry[]> {
    if (!this.store.entries.some((e) => e.id === id)) {
      return [];
    }
    const chain = collectChainIds(
      id,
      (current) => this.lifecycleOf(current).supersededBy,
      (current) =>
        this.store.entries
          .filter((e) => this.lifecycleOf(e.id).supersededBy === current)
          .map((e) => e.id),
    );
    return chainOrder(
      this.store.entries.filter((e) => chain.has(e.id)).map((e) => this.withLifecycle(e)),
    );
  }

  async searchMemory(
    query: string,
    options: SearchMemoryOptions = {},
  ): Promise<import("@zeref/contracts").MemorySearchResult> {
    const limit = options.limit ?? 10;
    const includeContradicted = options.includeContradicted ?? false;
    const includeArchived = options.includeArchived ?? false;
    const now = new Date();

    const filtered = this.store.entries.filter((entry) => {
      if (!includeContradicted && entry.observation === "contradicted") {
        return false;
      }
      if (!includeArchived && this.lifecycleOf(entry.id).archivedAt) {
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

  async saveVaultItem(input: SaveVaultItemInput): Promise<VaultItem> {
    const { entry } = await this.saveMemory(
      toVaultSaveInput(input.kind, input.content, input),
    );
    return toVaultItem(entry);
  }

  async listVaultItems(options: ListVaultItemsOptions = {}): Promise<VaultItem[]> {
    const current = options.includeHistory
      ? this.store.entries
      : this.store.entries.filter((e) => {
          const links = this.lifecycle.get(e.id);
          return !links?.supersededBy && !links?.archivedAt;
        });
    return selectVaultItems(current, options);
  }

  async forgetVaultItem(id: string): Promise<VaultForgetResult> {
    const idx = this.store.entries.findIndex((e) => e.id === id);
    if (idx < 0 || !isVaultEntry(this.store.entries[idx])) {
      return { deleted: false };
    }
    this.store.entries.splice(idx, 1);
    this.lifecycle.delete(id);
    for (const [otherId, links] of this.lifecycle) {
      if (links.supersededBy === id) {
        this.lifecycle.set(otherId, { ...links, supersededBy: null });
      }
    }
    return { deleted: true };
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
