import { z } from "zod";
import { JobTypeSchema } from "../enums.js";

/** Calendar event lifecycle (ADR-029). */
export const CalendarEventStatusSchema = z.enum([
  "draft",
  "scheduled",
  "completed",
  "cancelled",
]);
export type CalendarEventStatus = z.infer<typeof CalendarEventStatusSchema>;

/** Persisted calendar event (ADR-029). */
export const CalendarEventSchema = z
  .object({
    id: z.string().uuid(),
    title: z.string().min(1),
    scheduledAt: z.string().datetime({ offset: true }),
    jobType: JobTypeSchema.optional(),
    payload: z.record(z.unknown()).default({}),
    status: CalendarEventStatusSchema,
    createdAt: z.string().datetime({ offset: true }),
    updatedAt: z.string().datetime({ offset: true }),
  })
  .strict();
export type CalendarEvent = z.infer<typeof CalendarEventSchema>;
