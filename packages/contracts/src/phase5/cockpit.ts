import { z } from "zod";
import { ReportArtifactIdSchema } from "../ids.js";

export const CockpitStudioItemSchema = z
  .object({
    entityId: z.string().uuid(),
    title: z.string().min(1),
    snapshotId: z.string().uuid().optional(),
    updatedAt: z.string().datetime({ offset: true }).optional(),
  })
  .strict();

export const CockpitCalendarItemSchema = z
  .object({
    id: z.string().uuid(),
    title: z.string().min(1),
    scheduledAt: z.string().datetime({ offset: true }).optional(),
  })
  .strict();

export const CockpitReportItemSchema = z
  .object({
    artifactId: ReportArtifactIdSchema,
    kind: z.literal("elite"),
    headline: z.string().min(1),
    createdAt: z.string().datetime({ offset: true }),
  })
  .strict();

export const CockpitResearchItemSchema = z
  .object({
    id: z.string().uuid(),
    title: z.string().min(1),
    trendScore: z.number().optional(),
  })
  .strict();

const panelBase = {
  insufficientData: z.boolean(),
};

export const CockpitStudioPanelSchema = z
  .object({
    ...panelBase,
    items: z.array(CockpitStudioItemSchema),
  })
  .strict();

export const CockpitCalendarPanelSchema = z
  .object({
    ...panelBase,
    items: z.array(CockpitCalendarItemSchema),
  })
  .strict();

export const CockpitReportsPanelSchema = z
  .object({
    ...panelBase,
    items: z.array(CockpitReportItemSchema),
  })
  .strict();

export const CockpitResearchPanelSchema = z
  .object({
    ...panelBase,
    items: z.array(CockpitResearchItemSchema),
  })
  .strict();

/** Phase 5 cockpit BFF summary DTO (C24 / Q2). */
export const CockpitSlicesSchema = z
  .object({
    schemaVersion: z.literal("phase5-cockpit-v1"),
    panels: z
      .object({
        studio: CockpitStudioPanelSchema,
        calendar: CockpitCalendarPanelSchema,
        reports: CockpitReportsPanelSchema,
        research: CockpitResearchPanelSchema,
      })
      .strict(),
  })
  .strict();

export type CockpitSlices = z.infer<typeof CockpitSlicesSchema>;
export type CockpitStudioItem = z.infer<typeof CockpitStudioItemSchema>;
export type CockpitCalendarItem = z.infer<typeof CockpitCalendarItemSchema>;
export type CockpitReportItem = z.infer<typeof CockpitReportItemSchema>;
export type CockpitResearchItem = z.infer<typeof CockpitResearchItemSchema>;
