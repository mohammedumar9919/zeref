export {
  saveMemory,
  searchMemory,
  verifyMemory,
  createEntity,
  updateEntity,
  queryEntities,
  relateEntities,
  saveVaultItem,
  listVaultItems,
  forgetVaultItem,
  getMemoryAdapter,
  resetMemoryAdapterCache,
  isMemoryMockMode,
} from "./memory-service.js";

export { autoTierClassifier } from "./tier-classifier.js";
export { temporalScore, getHalfLifeDays } from "./temporal-score.js";
export { ruleBasedContradictionCheck } from "./contradiction.js";
export {
  VAULT_SOURCE,
  toVaultSaveInput,
  isVaultEntry,
  toVaultItem,
  type VaultSaveOptions,
} from "./vault.js";
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
  SaveVaultItemInput,
  ListVaultItemsOptions,
  MemoryAdapter,
  MemoryEntry,
  MemoryEntity,
  MemoryRelation,
  MemorySearchResult,
  MemoryTier,
  VaultForgetResult,
  VaultItem,
  VaultKind,
} from "./types.js";

export {
  MemoryEntrySchema,
  MemorySearchResultSchema,
  MemoryEntitySchema,
  MemoryBrainEventSchema,
  CockpitSseOutboxSchema,
  VaultKindSchema,
  VaultItemSchema,
  PHASE7_CONTRACT_VERSION,
} from "@zeref/contracts";
