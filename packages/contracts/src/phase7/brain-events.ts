import { z } from "zod";
import { MemoryTierSchema } from "./memory.js";

/** SSE memory.saved (ADR-027). */
export const MemorySavedEventSchema = z
  .object({
    type: z.literal("memory.saved"),
    entryId: z.string().uuid(),
    tier: MemoryTierSchema,
    ts: z.string().datetime({ offset: true }),
    turnId: z.string().uuid().optional(),
    simulated: z.boolean().optional(),
  })
  .strict();

/** SSE memory.search (ADR-027). */
export const MemorySearchEventSchema = z
  .object({
    type: z.literal("memory.search"),
    query: z.string().min(1),
    resultCount: z.number().int().min(0),
    ts: z.string().datetime({ offset: true }),
    turnId: z.string().uuid().optional(),
    simulated: z.boolean().optional(),
  })
  .strict();

/** SSE memory.contradiction (ADR-027). */
export const MemoryContradictionEventSchema = z
  .object({
    type: z.literal("memory.contradiction"),
    entryId: z.string().uuid(),
    supersededId: z.string().uuid(),
    ts: z.string().datetime({ offset: true }),
    simulated: z.boolean().optional(),
  })
  .strict();

/** SSE memory.entity_changed (ADR-027). */
export const MemoryEntityChangedEventSchema = z
  .object({
    type: z.literal("memory.entity_changed"),
    entityId: z.string().uuid(),
    entityType: z.string().min(1),
    ts: z.string().datetime({ offset: true }),
    simulated: z.boolean().optional(),
  })
  .strict();

export const MemoryBrainEventSchema = z.discriminatedUnion("type", [
  MemorySavedEventSchema,
  MemorySearchEventSchema,
  MemoryContradictionEventSchema,
  MemoryEntityChangedEventSchema,
]);

export type MemorySavedEvent = z.infer<typeof MemorySavedEventSchema>;
export type MemorySearchEvent = z.infer<typeof MemorySearchEventSchema>;
export type MemoryContradictionEvent = z.infer<typeof MemoryContradictionEventSchema>;
export type MemoryEntityChangedEvent = z.infer<typeof MemoryEntityChangedEventSchema>;
export type MemoryBrainEvent = z.infer<typeof MemoryBrainEventSchema>;
