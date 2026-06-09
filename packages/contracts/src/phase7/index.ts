export const PHASE7_CONTRACT_VERSION = "7.0.0";

export {
  MemoryTierSchema,
  MemoryObservationSchema,
  MemorySourceSchema,
  MemoryEntrySchema,
  MemorySearchResultItemSchema,
  MemorySearchResultSchema,
  MemoryEntitySchema,
  MemoryRelationSchema,
  type MemoryTier,
  type MemoryObservation,
  type MemorySource,
  type MemoryEntry,
  type MemorySearchResultItem,
  type MemorySearchResult,
  type MemoryEntity,
  type MemoryRelation,
} from "./memory.js";

export {
  MemorySavedEventSchema,
  MemorySearchEventSchema,
  MemoryContradictionEventSchema,
  MemoryEntityChangedEventSchema,
  MemoryBrainEventSchema,
  type MemorySavedEvent,
  type MemorySearchEvent,
  type MemoryContradictionEvent,
  type MemoryEntityChangedEvent,
  type MemoryBrainEvent,
} from "./brain-events.js";

export {
  CockpitSseOutboxSchema,
  type CockpitSseOutbox,
} from "./outbox.js";
