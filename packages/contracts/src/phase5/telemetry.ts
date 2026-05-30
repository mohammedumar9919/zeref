import { z } from "zod";

/** Phase 5.1 SSE telemetry event (ADR-019). Stub events set simulated: true. */
export const TelemetryEventSchema = z
  .object({
    simulated: z.boolean(),
    message: z.string().min(1),
    ts: z.string().datetime({ offset: true }),
  })
  .strict();

export type TelemetryEvent = z.infer<typeof TelemetryEventSchema>;
