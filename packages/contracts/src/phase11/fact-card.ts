import { z } from "zod";
import { JarvisToolNameSchema } from "../phase6/jarvis-turn.js";

/** Provenance badge shown on every fact card (C17a). */
export const FactCardBadgeSchema = z.enum(["FIXTURE", "SIMULATED", "LIVE"]);
export type FactCardBadge = z.infer<typeof FactCardBadgeSchema>;

export const FACT_CARD_MAX_FIELDS = 6;

/** One label/value row; values are display strings copied from the tool result. */
export const FactCardFieldSchema = z
  .object({
    label: z.string().min(1).max(40),
    value: z.string().min(1).max(160),
    unit: z.string().min(1).max(16).optional(),
  })
  .strict();
export type FactCardField = z.infer<typeof FactCardFieldSchema>;

/** HUD fact card built server-side from a whitelisted tool result (C17a). */
export const FactCardSchema = z
  .object({
    id: z.string().min(1).max(80),
    runId: z.string().uuid(),
    toolName: JarvisToolNameSchema,
    title: z.string().min(1).max(120),
    fields: z.array(FactCardFieldSchema).max(FACT_CARD_MAX_FIELDS),
    badge: FactCardBadgeSchema,
    ts: z.string().datetime({ offset: true }),
  })
  .strict();
export type FactCard = z.infer<typeof FactCardSchema>;

/** Cockpit bus / SSE event name; the payload is a bare `FactCard`. */
export const FACT_CARD_EVENT = "jarvis.fact_card";
