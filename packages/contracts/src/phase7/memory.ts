import { z } from "zod";

export const MemoryTierSchema = z.enum([
  "episodic",
  "semantic",
  "project",
  "procedural",
]);

export const MemoryObservationSchema = z.enum([
  "verified",
  "stale",
  "contradicted",
]);

export const MemorySourceSchema = z.enum([
  "voice",
  "worker",
  "kernel",
  "manual",
  "system",
]);

/** Persisted memory entry (ADR-025). */
export const MemoryEntrySchema = z
  .object({
    id: z.string().uuid(),
    tier: MemoryTierSchema,
    content: z.string().min(1),
    source: MemorySourceSchema,
    entityId: z.string().uuid().nullable(),
    valueKey: z.string().min(1).nullable(),
    value: z.string().nullable(),
    temporalScore: z.number().min(0).max(1),
    observation: MemoryObservationSchema,
    metadata: z.record(z.unknown()).default({}),
    createdAt: z.string().datetime({ offset: true }),
    updatedAt: z.string().datetime({ offset: true }),
  })
  .strict();

export const MemorySearchResultItemSchema = z
  .object({
    entry: MemoryEntrySchema,
    rank: z.number().int().min(0),
    score: z.number().min(0),
  })
  .strict();

/** Ranked search response from `@zeref/zeref-memory`. */
export const MemorySearchResultSchema = z
  .object({
    query: z.string(),
    results: z.array(MemorySearchResultItemSchema),
    totalCount: z.number().int().min(0),
    ts: z.string().datetime({ offset: true }),
  })
  .strict();

export const MemoryEntitySchema = z
  .object({
    id: z.string().uuid(),
    type: z.string().min(1),
    name: z.string().min(1),
    stateJson: z.record(z.unknown()).default({}),
    transitionHistory: z
      .array(
        z
          .object({
            ts: z.string().datetime({ offset: true }),
            patch: z.record(z.unknown()),
          })
          .strict(),
      )
      .default([]),
    createdAt: z.string().datetime({ offset: true }),
    updatedAt: z.string().datetime({ offset: true }),
  })
  .strict();

export const MemoryRelationSchema = z
  .object({
    id: z.string().uuid(),
    fromEntityId: z.string().uuid(),
    toEntityId: z.string().uuid(),
    relationType: z.string().min(1),
    metadata: z.record(z.unknown()).default({}),
    createdAt: z.string().datetime({ offset: true }),
  })
  .strict();

export type MemoryTier = z.infer<typeof MemoryTierSchema>;
export type MemoryObservation = z.infer<typeof MemoryObservationSchema>;
export type MemorySource = z.infer<typeof MemorySourceSchema>;
export type MemoryEntry = z.infer<typeof MemoryEntrySchema>;
export type MemorySearchResultItem = z.infer<typeof MemorySearchResultItemSchema>;
export type MemorySearchResult = z.infer<typeof MemorySearchResultSchema>;
export type MemoryEntity = z.infer<typeof MemoryEntitySchema>;
export type MemoryRelation = z.infer<typeof MemoryRelationSchema>;
