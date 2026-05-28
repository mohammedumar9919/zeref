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
