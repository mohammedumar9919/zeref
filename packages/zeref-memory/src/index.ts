export {
  saveMemory,
  searchMemory,
  verifyMemory,
  createEntity,
  updateEntity,
  queryEntities,
  relateEntities,
  getMemoryAdapter,
  resetMemoryAdapterCache,
  isMemoryMockMode,
} from "./memory-service.js";

export { autoTierClassifier } from "./tier-classifier.js";
export { temporalScore, getHalfLifeDays } from "./temporal-score.js";
export { ruleBasedContradictionCheck } from "./contradiction.js";
export { createMockMemoryAdapter, MockMemoryAdapter } from "./mock-adapter.js";
export { createPostgresMemoryAdapter, PostgresMemoryAdapter } from "./postgres-adapter.js";

export type {
  SaveMemoryInput,
  SaveMemoryResult,
  SearchMemoryOptions,
  VerifyMemoryInput,
  CreateEntityInput,
  UpdateEntityInput,
  QueryEntitiesOptions,
  RelateEntitiesInput,
  TierClassifierContext,
  MemoryAdapter,
  MemoryEntry,
  MemoryEntity,
  MemoryRelation,
  MemorySearchResult,
  MemoryTier,
} from "./types.js";

export {
  MemoryEntrySchema,
  MemorySearchResultSchema,
  MemoryEntitySchema,
  MemoryBrainEventSchema,
  CockpitSseOutboxSchema,
  PHASE7_CONTRACT_VERSION,
} from "@zeref/contracts";
