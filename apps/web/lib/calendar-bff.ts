import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";

import {
  CalendarEventSchema,
  CalendarEventStatusSchema,
  type CalendarEvent,
} from "@zeref/contracts";
import { calendarEvents } from "@zeref/db";
import { desc, eq } from "drizzle-orm";
import { z } from "zod";

import { getDb, isFixtureMode } from "./db";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "../../..");
const phase8FixturesRoot = join(repoRoot, "fixtures/phase-8");

export const CalendarEventCreateSchema = z
  .object({
    title: z.string().min(1),
    scheduledAt: z.string().datetime({ offset: true }),
    jobType: z.string().min(1).optional(),
    payload: z.record(z.unknown()).optional(),
    status: CalendarEventStatusSchema.optional(),
  })
  .strict();

export const CalendarEventPatchSchema = z
  .object({
    title: z.string().min(1).optional(),
    scheduledAt: z.string().datetime({ offset: true }).optional(),
    jobType: z.string().min(1).nullable().optional(),
    payload: z.record(z.unknown()).optional(),
    status: CalendarEventStatusSchema.optional(),
  })
  .strict();

export type BffResult<T> =
  | { status: 200; body: T }
  | { status: 201; body: T }
  | { status: 404; body: { error: string } }
  | { status: 400; body: { error: string } }
  | { status: 500; body: { error: string } };

function loadPhase8Fixture(name: string): unknown {
  return JSON.parse(readFileSync(join(phase8FixturesRoot, name), "utf8"));
}

function toIsoString(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : value;
}

function rowToCalendarEvent(row: {
  id: string;
  title: string;
  scheduledAt: Date | string;
  jobType: string | null;
  payloadJson: Record<string, unknown>;
  status: string;
  createdAt: Date | string;
  updatedAt: Date | string;
}): CalendarEvent {
  return CalendarEventSchema.parse({
    id: row.id,
    title: row.title,
    scheduledAt: toIsoString(row.scheduledAt),
    jobType: row.jobType ?? undefined,
    payload: row.payloadJson ?? {},
    status: row.status,
    createdAt: toIsoString(row.createdAt),
    updatedAt: toIsoString(row.updatedAt),
  });
}

let fixtureEvents: CalendarEvent[] | null = null;

function ensureFixtureEvents(): CalendarEvent[] {
  if (!fixtureEvents) {
    fixtureEvents = [CalendarEventSchema.parse(loadPhase8Fixture("calendar-event.valid.json"))];
  }
  return fixtureEvents;
}

/** Test hook — resets in-memory fixture calendar events. */
export function resetCalendarFixtureStateForTests(): void {
  fixtureEvents = null;
}

function listCalendarEventsFixture(): BffResult<{ events: CalendarEvent[] }> {
  return { status: 200, body: { events: [...ensureFixtureEvents()] } };
}

async function listCalendarEventsFromDb(): Promise<BffResult<{ events: CalendarEvent[] }>> {
  const db = getDb();
  if (!db) {
    return { status: 500, body: { error: "database not configured" } };
  }

  const rows = await db
    .select()
    .from(calendarEvents)
    .orderBy(desc(calendarEvents.scheduledAt));

  return {
    status: 200,
    body: { events: rows.map((row) => rowToCalendarEvent(row)) },
  };
}

/** GET calendar events list (ADR-029). */
export async function listCalendarEvents(): Promise<BffResult<{ events: CalendarEvent[] }>> {
  if (isFixtureMode()) {
    return listCalendarEventsFixture();
  }

  return listCalendarEventsFromDb();
}

function createCalendarEventFixture(
  rawBody: unknown,
): BffResult<CalendarEvent> {
  const parsed = CalendarEventCreateSchema.safeParse(rawBody);
  if (!parsed.success) {
    return { status: 400, body: { error: "invalid calendar event body" } };
  }

  const now = new Date().toISOString();
  const created = CalendarEventSchema.parse({
    id: randomUUID(),
    title: parsed.data.title,
    scheduledAt: parsed.data.scheduledAt,
    jobType: parsed.data.jobType,
    payload: parsed.data.payload ?? {},
    status: parsed.data.status ?? "draft",
    createdAt: now,
    updatedAt: now,
  });

  ensureFixtureEvents().push(created);
  return { status: 201, body: created };
}

async function createCalendarEventInDb(rawBody: unknown): Promise<BffResult<CalendarEvent>> {
  const parsed = CalendarEventCreateSchema.safeParse(rawBody);
  if (!parsed.success) {
    return { status: 400, body: { error: "invalid calendar event body" } };
  }

  const db = getDb();
  if (!db) {
    return { status: 500, body: { error: "database not configured" } };
  }

  const now = new Date();
  const inserted = await db
    .insert(calendarEvents)
    .values({
      title: parsed.data.title,
      scheduledAt: new Date(parsed.data.scheduledAt),
      jobType: parsed.data.jobType ?? null,
      payloadJson: parsed.data.payload ?? {},
      status: parsed.data.status ?? "draft",
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  const row = inserted[0];
  if (!row) {
    return { status: 500, body: { error: "failed to create calendar event" } };
  }

  return { status: 201, body: rowToCalendarEvent(row) };
}

/** POST calendar event create (ADR-029). */
export async function createCalendarEvent(rawBody: unknown): Promise<BffResult<CalendarEvent>> {
  if (isFixtureMode()) {
    return createCalendarEventFixture(rawBody);
  }

  return createCalendarEventInDb(rawBody);
}

function patchCalendarEventFixture(
  eventId: string,
  rawBody: unknown,
): BffResult<CalendarEvent> {
  const parsed = CalendarEventPatchSchema.safeParse(rawBody);
  if (!parsed.success) {
    return { status: 400, body: { error: "invalid calendar event patch body" } };
  }

  const events = ensureFixtureEvents();
  const index = events.findIndex((event) => event.id === eventId);
  if (index < 0) {
    return { status: 404, body: { error: "calendar event not found" } };
  }

  const current = events[index];
  const updated = CalendarEventSchema.parse({
    ...current,
    title: parsed.data.title ?? current.title,
    scheduledAt: parsed.data.scheduledAt ?? current.scheduledAt,
    jobType:
      parsed.data.jobType === null
        ? undefined
        : (parsed.data.jobType ?? current.jobType),
    payload: parsed.data.payload ?? current.payload,
    status: parsed.data.status ?? current.status,
    updatedAt: new Date().toISOString(),
  });
  events[index] = updated;
  return { status: 200, body: updated };
}

async function patchCalendarEventInDb(
  eventId: string,
  rawBody: unknown,
): Promise<BffResult<CalendarEvent>> {
  const parsed = CalendarEventPatchSchema.safeParse(rawBody);
  if (!parsed.success) {
    return { status: 400, body: { error: "invalid calendar event patch body" } };
  }

  const db = getDb();
  if (!db) {
    return { status: 500, body: { error: "database not configured" } };
  }

  const existing = await db
    .select()
    .from(calendarEvents)
    .where(eq(calendarEvents.id, eventId))
    .limit(1);

  const row = existing[0];
  if (!row) {
    return { status: 404, body: { error: "calendar event not found" } };
  }

  const now = new Date();
  const updated = await db
    .update(calendarEvents)
    .set({
      title: parsed.data.title ?? row.title,
      scheduledAt: parsed.data.scheduledAt
        ? new Date(parsed.data.scheduledAt)
        : row.scheduledAt,
      jobType:
        parsed.data.jobType === null
          ? null
          : (parsed.data.jobType ?? row.jobType),
      payloadJson: parsed.data.payload ?? row.payloadJson,
      status: parsed.data.status ?? row.status,
      updatedAt: now,
    })
    .where(eq(calendarEvents.id, eventId))
    .returning();

  const next = updated[0];
  if (!next) {
    return { status: 500, body: { error: "failed to update calendar event" } };
  }

  return { status: 200, body: rowToCalendarEvent(next) };
}

/** PATCH calendar event update (ADR-029). */
export async function patchCalendarEvent(
  eventId: string,
  rawBody: unknown,
): Promise<BffResult<CalendarEvent>> {
  if (isFixtureMode()) {
    return patchCalendarEventFixture(eventId, rawBody);
  }

  return patchCalendarEventInDb(eventId, rawBody);
}
