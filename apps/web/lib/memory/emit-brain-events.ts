import {
  MemoryBrainEventSchema,
  MemoryContradictionEventSchema,
  type MemoryBrainEvent,
} from "@zeref/contracts";

import { getCockpitEventBus } from "../cockpit/cockpit-event-bus.js";

type ToolCallLike = {
  name: string;
  result?: unknown;
};

function parseBrainEvent(result: unknown): MemoryBrainEvent | null {
  if (!result || typeof result !== "object") {
    return null;
  }
  const candidate = (result as { brainEvent?: unknown }).brainEvent;
  if (!candidate) {
    return null;
  }
  const parsed = MemoryBrainEventSchema.safeParse(candidate);
  return parsed.success ? parsed.data : null;
}

function emitContradictions(
  result: unknown,
  simulated: boolean | undefined,
): void {
  if (!result || typeof result !== "object") {
    return;
  }
  const saveResult = (result as { saveResult?: { contradictions?: unknown[] } })
    .saveResult;
  const contradictions = saveResult?.contradictions;
  if (!Array.isArray(contradictions) || contradictions.length === 0) {
    return;
  }

  const bus = getCockpitEventBus();
  const ts = new Date().toISOString();

  for (const raw of contradictions) {
    if (!raw || typeof raw !== "object") {
      continue;
    }
    const entryId =
      typeof (raw as { entryId?: unknown }).entryId === "string"
        ? (raw as { entryId: string }).entryId
        : undefined;
    const supersededId =
      typeof (raw as { supersededId?: unknown }).supersededId === "string"
        ? (raw as { supersededId: string }).supersededId
        : undefined;
    if (!entryId || !supersededId) {
      continue;
    }

    const event = MemoryContradictionEventSchema.parse({
      type: "memory.contradiction",
      entryId,
      supersededId,
      ts,
      ...(simulated !== undefined ? { simulated } : {}),
    });
    bus.emit(event.type, event);
  }
}

/** Map jarvis-kernel memory tool results to SSE brain events (C66). */
export function emitMemoryBrainEventsFromToolCalls(
  toolCalls: ToolCallLike[],
): void {
  const bus = getCockpitEventBus();

  for (const call of toolCalls) {
    if (call.name !== "memory_save" && call.name !== "memory_search") {
      continue;
    }

    const brainEvent = parseBrainEvent(call.result);
    if (brainEvent) {
      bus.emit(brainEvent.type, brainEvent);
    }

    if (call.name === "memory_save") {
      const simulated =
        brainEvent && "simulated" in brainEvent ? brainEvent.simulated : undefined;
      emitContradictions(call.result, simulated);
    }
  }
}
