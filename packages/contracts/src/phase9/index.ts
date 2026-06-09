export const PHASE9_CONTRACT_VERSION = "9.0.0";

export {
  ResearchSignalTypeSchema,
  ResearchTopicSchema,
  ResearchSignalSchema,
  ResearchTopicDetailSchema,
  ResearchMetricFactRowSchema,
  ResearchEmbeddingRowSchema,
  ResearchSignalCandidateSchema,
  type ResearchSignalType,
  type ResearchTopic,
  type ResearchSignal,
  type ResearchTopicDetail,
  type ResearchSignalCandidate,
} from "./research.js";

export {
  ResearchJobInputSchema,
  ResearchJobOutputSchema,
  UiJobTypeSchemaV9,
  JobEnqueueRequestSchemaV9,
  type ResearchJobInput,
  type ResearchJobOutput,
  type UiJobTypeV9,
  type JobEnqueueRequestV9,
} from "./jobs.js";

export {
  CockpitSlicesSchemaV9,
  CockpitStudioItemSchemaV9,
  CockpitCalendarItemSchemaV9,
  CockpitReportItemSchemaV9,
  CockpitResearchItemSchemaV9,
  CockpitStudioPanelSchemaV9,
  CockpitCalendarPanelSchemaV9,
  CockpitReportsPanelSchemaV9,
  CockpitResearchPanelSchemaV9,
  type CockpitSlicesV9,
  type CockpitResearchItemV9,
} from "./cockpit.js";
