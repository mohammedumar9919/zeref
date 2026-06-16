import { z } from "zod";
import { ReportArtifactIdSchema } from "../ids.js";
import { CalendarEventStatusSchema } from "./calendar.js";
import { CockpitItemDataAgeSchema, DataAgeStateSchema } from "../phase12/data-age.js";

const dataAgeItemExtensions = CockpitItemDataAgeSchema.partial().shape;

/** Amendment G — additive optional fields on panel items. */
const phase8ItemExtensions = {
  status: CalendarEventStatusSchema.optional(),
  draftPreview: z.string().min(1).optional(),
  hasDraft: z.boolean().optional(),
  ...dataAgeItemExtensions,
};

export const CockpitStudioItemSchemaV8 = z
  .object({
    entityId: z.string().uuid(),
    title: z.string().min(1),
    snapshotId: z.string().uuid().optional(),
    updatedAt: z.string().datetime({ offset: true }).optional(),
    scheduledAt: z.string().datetime({ offset: true }).optional(),
    ...phase8ItemExtensions,
  })
  .strict();

export const CockpitCalendarItemSchemaV8 = z
  .object({
    id: z.string().uuid(),
    title: z.string().min(1),
    scheduledAt: z.string().datetime({ offset: true }).optional(),
    ...phase8ItemExtensions,
  })
  .strict();

export const CockpitReportItemSchemaV8 = z
  .object({
    artifactId: ReportArtifactIdSchema,
    kind: z.literal("elite"),
    headline: z.string().min(1),
    createdAt: z.string().datetime({ offset: true }),
  })
  .strict();

export const CockpitResearchItemSchemaV8 = z
  .object({
    id: z.string().uuid(),
    title: z.string().min(1),
    trendScore: z.number().optional(),
  })
  .strict();

const panelBase = {
  insufficientData: z.boolean(),
  dataAgeState: DataAgeStateSchema.optional(),
};

export const CockpitStudioPanelSchemaV8 = z
  .object({
    ...panelBase,
    items: z.array(CockpitStudioItemSchemaV8),
  })
  .strict();

export const CockpitCalendarPanelSchemaV8 = z
  .object({
    ...panelBase,
    items: z.array(CockpitCalendarItemSchemaV8),
  })
  .strict();

export const CockpitReportsPanelSchemaV8 = z
  .object({
    ...panelBase,
    items: z.array(CockpitReportItemSchemaV8),
  })
  .strict();

export const CockpitResearchPanelSchemaV8 = z
  .object({
    ...panelBase,
    items: z.array(CockpitResearchItemSchemaV8),
  })
  .strict();

/** Phase 8 cockpit BFF summary DTO (Amendment G). */
export const CockpitSlicesSchemaV8 = z
  .object({
    schemaVersion: z.literal("phase8-cockpit-v1"),
    panels: z
      .object({
        studio: CockpitStudioPanelSchemaV8,
        calendar: CockpitCalendarPanelSchemaV8,
        reports: CockpitReportsPanelSchemaV8,
        research: CockpitResearchPanelSchemaV8,
      })
      .strict(),
  })
  .strict();

export type CockpitSlicesV8 = z.infer<typeof CockpitSlicesSchemaV8>;
export type CockpitStudioItemV8 = z.infer<typeof CockpitStudioItemSchemaV8>;
export type CockpitCalendarItemV8 = z.infer<typeof CockpitCalendarItemSchemaV8>;
export type CockpitReportItemV8 = z.infer<typeof CockpitReportItemSchemaV8>;
export type CockpitResearchItemV8 = z.infer<typeof CockpitResearchItemSchemaV8>;
