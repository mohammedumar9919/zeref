import { z } from "zod";

/** Collect input sources (Phase 2). */
export const CollectSourceSchema = z.enum(["scrape", "graph"]);
export type CollectSource = z.infer<typeof CollectSourceSchema>;
