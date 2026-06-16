import { z } from "zod";

/** Cockpit / JARVIS data freshness badge state (ADR-042). */
export const DataAgeStateSchema = z.enum(["fixture", "stale", "live"]);

/** Per-item data-age metadata on cockpit slice items (C167). */
export const CockpitItemDataAgeSchema = z
  .object({
    collectedAt: z.string().datetime({ offset: true }),
    dataAgeMs: z.number().int().nonnegative(),
    dataAgeState: DataAgeStateSchema,
  })
  .strict();

export type DataAgeState = z.infer<typeof DataAgeStateSchema>;
export type CockpitItemDataAge = z.infer<typeof CockpitItemDataAgeSchema>;
