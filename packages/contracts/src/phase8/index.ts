export const PHASE8_CONTRACT_VERSION = "8.0.0";

export {
  CalendarEventStatusSchema,
  CalendarEventSchema,
  type CalendarEventStatus,
  type CalendarEvent,
} from "./calendar.js";

export {
  StudioDraftSchema,
  type StudioDraft,
} from "./studio.js";

export {
  UiJobTypeSchema,
  JobEnqueueRequestSchema,
  type UiJobType,
  type JobEnqueueRequest,
} from "./jobs.js";

export {
  CockpitSlicesSchemaV8,
  CockpitStudioItemSchemaV8,
  CockpitCalendarItemSchemaV8,
  CockpitReportItemSchemaV8,
  CockpitResearchItemSchemaV8,
  CockpitStudioPanelSchemaV8,
  CockpitCalendarPanelSchemaV8,
  CockpitReportsPanelSchemaV8,
  CockpitResearchPanelSchemaV8,
  type CockpitSlicesV8,
  type CockpitStudioItemV8,
  type CockpitCalendarItemV8,
  type CockpitReportItemV8,
  type CockpitResearchItemV8,
} from "./cockpit.js";
