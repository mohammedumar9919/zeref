import { z } from "zod";
import { JarvisToolNameSchema } from "../phase6/jarvis-turn.js";
import { JarvisRiskTierSchema } from "./agent.js";

/** Auditable tool invocation record (C151, C152). */
export const JarvisAuditEntrySchema = z
  .object({
    id: z.string().uuid(),
    runId: z.string().uuid(),
    stepIndex: z.number().int().nonnegative(),
    toolName: JarvisToolNameSchema,
    argsHash: z.string().min(1),
    riskTier: JarvisRiskTierSchema,
    resultSummary: z.string(),
    simulated: z.boolean(),
    createdAt: z.string().datetime({ offset: true }),
  })
  .strict();
export type JarvisAuditEntry = z.infer<typeof JarvisAuditEntrySchema>;
