import { z } from "zod";

/** Sparse analyze/report pathway when upstream data is too thin. */
export const InsufficientDataSchema = z.object({
  reason: z.string().min(1),
  details: z.record(z.string(), z.unknown()).optional(),
});
export type InsufficientData = z.infer<typeof InsufficientDataSchema>;
