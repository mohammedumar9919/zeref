import { z } from "zod";

/** Worker→SSE outbox row (ADR-027 Amendment B). */
export const CockpitSseOutboxSchema = z
  .object({
    id: z.string().uuid(),
    eventType: z.string().min(1),
    payloadJson: z.record(z.unknown()),
    createdAt: z.string().datetime({ offset: true }),
    deliveredAt: z.string().datetime({ offset: true }).nullable(),
  })
  .strict();

export type CockpitSseOutbox = z.infer<typeof CockpitSseOutboxSchema>;
