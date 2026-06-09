import type { MemoryBrainEvent } from "@zeref/contracts";

/** C67 / ADR-027 — orthogonal to voice globe state. */
export type BrainGlobeState =
  | "idle"
  | "memory_saved"
  | "searching"
  | "contradiction"
  | "entity_changed";

export function brainStateFromMemoryEvent(event: MemoryBrainEvent): BrainGlobeState {
  switch (event.type) {
    case "memory.saved":
      return "memory_saved";
    case "memory.search":
      return "searching";
    case "memory.contradiction":
      return "contradiction";
    case "memory.entity_changed":
      return "entity_changed";
    default: {
      const _exhaustive: never = event;
      return _exhaustive;
    }
  }
}

/** Jarvis-orb style transient pulse duration (shader-safe, no bloom). */
export const BRAIN_STATE_IDLE_MS = 2500;
