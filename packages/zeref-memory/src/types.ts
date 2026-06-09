import type {
  MemoryEntry,
  MemoryEntity,
  MemoryObservation,
  MemoryRelation,
  MemorySearchResult,
  MemorySource,
  MemoryTier,
} from "@zeref/contracts";

export type SaveMemoryInput = {
  content: string;
  tier?: MemoryTier;
  source?: MemorySource;
  entityId?: string | null;
  valueKey?: string | null;
  value?: string | null;
  metadata?: Record<string, unknown>;
  createdAt?: Date;
};

export type SaveMemoryResult = {
  entry: MemoryEntry;
  contradictions: Array<{ supersededId: string; entryId: string }>;
};

export type SearchMemoryOptions = {
  limit?: number;
  includeContradicted?: boolean;
  tier?: MemoryTier;
};

export type VerifyMemoryInput = {
  entryId: string;
  observation: MemoryObservation;
};

export type CreateEntityInput = {
  type: string;
  name: string;
  stateJson?: Record<string, unknown>;
};

export type UpdateEntityInput = {
  entityId: string;
  patch: Record<string, unknown>;
};

export type QueryEntitiesOptions = {
  type?: string;
  name?: string;
  limit?: number;
};

export type RelateEntitiesInput = {
  fromEntityId: string;
  toEntityId: string;
  relationType: string;
  metadata?: Record<string, unknown>;
};

export type TierClassifierContext = {
  source?: MemorySource;
  snapshotId?: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
};

export interface MemoryAdapter {
  saveMemory(input: SaveMemoryInput): Promise<SaveMemoryResult>;
  searchMemory(query: string, options?: SearchMemoryOptions): Promise<MemorySearchResult>;
  verifyMemory(input: VerifyMemoryInput): Promise<MemoryEntry>;
  createEntity(input: CreateEntityInput): Promise<MemoryEntity>;
  updateEntity(input: UpdateEntityInput): Promise<MemoryEntity>;
  queryEntities(options?: QueryEntitiesOptions): Promise<MemoryEntity[]>;
  relateEntities(input: RelateEntitiesInput): Promise<MemoryRelation>;
}

export type { MemoryEntry, MemoryEntity, MemoryRelation, MemorySearchResult, MemoryTier };
