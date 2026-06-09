export * from "./schema/index.js";
export { schema } from "./schema/index.js";

/** Phase 1 pipeline tables (snake_case SQL names). */
export const PHASE1_TABLES = [
  "platform_accounts",
  "snapshots",
  "normalized_entities",
  "analysis_outputs",
  "report_artifacts",
] as const;

/** Phase 3 analytics + embeddings tables. */
export const PHASE3_TABLES = ["metric_facts", "embedding_vectors"] as const;

/** Phase 8 studio + calendar tables. */
export const PHASE8_TABLES = ["calendar_events", "studio_drafts"] as const;
