import {
  MemoryBrainEventSchema,
  MemoryContradictionEventSchema,
  MemoryEntityChangedEventSchema,
  MemorySavedEventSchema,
  MemorySearchEventSchema,
  type MemoryBrainEvent,
  type MemoryContradictionEvent,
  type MemoryEntityChangedEvent,
  type MemorySavedEvent,
  type MemorySearchEvent,
} from "@zeref/contracts";

export function parseMemorySavedEvent(data: unknown): MemorySavedEvent {
  return MemorySavedEventSchema.parse(data);
}

export function parseMemorySearchEvent(data: unknown): MemorySearchEvent {
  return MemorySearchEventSchema.parse(data);
}

export function parseMemoryContradictionEvent(data: unknown): MemoryContradictionEvent {
  return MemoryContradictionEventSchema.parse(data);
}

export function parseMemoryEntityChangedEvent(data: unknown): MemoryEntityChangedEvent {
  return MemoryEntityChangedEventSchema.parse(data);
}

export function parseMemoryBrainEvent(data: unknown): MemoryBrainEvent {
  return MemoryBrainEventSchema.parse(data);
}
