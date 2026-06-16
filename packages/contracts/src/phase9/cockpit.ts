import { z } from "zod";
import { ReportArtifactIdSchema } from "../ids.js";
import { CalendarEventStatusSchema } from "../phase8/calendar.js";
import { CockpitItemDataAgeSchema, DataAgeStateSchema } from "../phase12/data-age.js";

const dataAgeItemExtensions = CockpitItemDataAgeSchema.partial().shape;

/** Amendment G carry-forward + Phase 9 research fields (ADR-031). */
const phase9ItemExtensions = {
  status: CalendarEventStatusSchema.optional(),
  draftPreview: z.string().min(1).optional(),
  hasDraft: z.boolean().optional(),
  ...dataAgeItemExtensions,
};

export const CockpitStudioItemSchemaV9 = z
  .object({
    entityId: z.string().uuid(),
    title: z.string().min(1),
    snapshotId: z.string().uuid().optional(),
    updatedAt: z.string().datetime({ offset: true }).optional(),
    scheduledAt: z.string().datetime({ offset: true }).optional(),
    ...phase9ItemExtensions,
  })
  .strict();

export const CockpitCalendarItemSchemaV9 = z
  .object({
    id: z.string().uuid(),
    title: z.string().min(1),
    scheduledAt: z.string().datetime({ offset: true }).optional(),
    ...phase9ItemExtensions,
  })
  .strict();

export const CockpitReportItemSchemaV9 = z
  .object({
    artifactId: ReportArtifactIdSchema,
    kind: z.literal("elite"),
    headline: z.string().min(1),
    createdAt: z.string().datetime({ offset: true }),
  })
  .strict();

export const CockpitResearchItemSchemaV9 = z
  .object({
    id: z.string().uuid(),
    title: z.string().min(1),
    trendScore: z.number().optional(),
    signalCount: z.number().int().nonnegative().optional(),
    lastComputedAt: z.string().datetime({ offset: true }).optional(),
  })
  .strict();

const panelBase = {
  insufficientData: z.boolean(),
  dataAgeState: DataAgeStateSchema.optional(),
};

export const CockpitStudioPanelSchemaV9 = z
  .object({
    ...panelBase,
    items: z.array(CockpitStudioItemSchemaV9),
  })
  .strict();

export const CockpitCalendarPanelSchemaV9 = z
  .object({
    ...panelBase,
    items: z.array(CockpitCalendarItemSchemaV9),
  })
  .strict();

export const CockpitReportsPanelSchemaV9 = z
  .object({
    ...panelBase,
    items: z.array(CockpitReportItemSchemaV9),
  })
  .strict();

export const CockpitResearchPanelSchemaV9 = z
  .object({
    ...panelBase,
    items: z.array(CockpitResearchItemSchemaV9),
  })
  .strict();

/** Phase 9 cockpit BFF summary DTO (C86). */
export const CockpitSlicesSchemaV9 = z
  .object({
    schemaVersion: z.literal("phase9-cockpit-v1"),
    panels: z
      .object({
        studio: CockpitStudioPanelSchemaV9,
        calendar: CockpitCalendarPanelSchemaV9,
        reports: CockpitReportsPanelSchemaV9,
        research: CockpitResearchPanelSchemaV9,
      })
      .strict(),
  })
  .strict();

export type CockpitSlicesV9 = z.infer<typeof CockpitSlicesSchemaV9>;
export type CockpitResearchItemV9 = z.infer<typeof CockpitResearchItemSchemaV9>;
