export { cohortVsBaselineLabel, type CohortVsBaseline } from "./cohort.js";
export {
  buildCitationIndex,
  lintNarrativeCitations,
  buildDefaultNarrativeMarkdown,
  type MetricFactCitationSource,
} from "./citations.js";
export {
  generateNarrative,
  narrativeCitationIndex,
  DEFAULT_OPENROUTER_MODEL,
  type NarrativeInput,
  type NarrativeResult,
} from "./narrative.js";
export {
  buildEliteReport,
  type AnalysisPayload,
  type BuildEliteReportInput,
} from "./elite/build.js";
