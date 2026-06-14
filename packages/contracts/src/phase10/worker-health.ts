import { z } from "zod";

/** GET /api/v1/ops/worker-health response (Phase 10 — C113). */
export const WorkerHealthResponseSchema = z
  .object({
    consuming: z.boolean(),
    source: z.string().min(1),
  })
  .strict();

export type WorkerHealthResponse = z.infer<typeof WorkerHealthResponseSchema>;
