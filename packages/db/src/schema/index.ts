export { platformAccounts } from "./platform-accounts.js";
export { snapshots } from "./snapshots.js";
export { normalizedEntities } from "./normalized-entities.js";
export { analysisOutputs } from "./analysis-outputs.js";
export { reportArtifacts } from "./report-artifacts.js";
export { metricFacts } from "./metric-facts.js";
export {
  embeddingVectors,
  DEFAULT_EMBEDDING_MODEL,
  EMBEDDING_DIMENSIONS,
} from "./embedding-vectors.js";
export { memoryEntries } from "./memory-entries.js";
export { memoryEntities } from "./memory-entities.js";
export { memoryRelations } from "./memory-relations.js";
export { memoryObservations } from "./memory-observations.js";
export { cockpitSseOutbox } from "./cockpit-sse-outbox.js";
export { calendarEvents } from "./calendar-events.js";
export { studioDrafts } from "./studio-drafts.js";

import { platformAccounts } from "./platform-accounts.js";
import { snapshots } from "./snapshots.js";
import { normalizedEntities } from "./normalized-entities.js";
import { analysisOutputs } from "./analysis-outputs.js";
import { reportArtifacts } from "./report-artifacts.js";
import { metricFacts } from "./metric-facts.js";
import { embeddingVectors } from "./embedding-vectors.js";
import { memoryEntries } from "./memory-entries.js";
import { memoryEntities } from "./memory-entities.js";
import { memoryRelations } from "./memory-relations.js";
import { memoryObservations } from "./memory-observations.js";
import { cockpitSseOutbox } from "./cockpit-sse-outbox.js";
import { calendarEvents } from "./calendar-events.js";
import { studioDrafts } from "./studio-drafts.js";

export const schema = {
  platformAccounts,
  snapshots,
  normalizedEntities,
  analysisOutputs,
  reportArtifacts,
  metricFacts,
  embeddingVectors,
  memoryEntries,
  memoryEntities,
  memoryRelations,
  memoryObservations,
  cockpitSseOutbox,
  calendarEvents,
  studioDrafts,
};
