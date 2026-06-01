import { PipelineEventSchema } from "@zeref/contracts";
import { cockpitSseOutbox } from "@zeref/db";
import { and, asc, eq, isNull } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";

import { getDb } from "../db.js";
import { getCockpitEventBus } from "./cockpit-event-bus.js";

export const COCKPIT_OUTBOX_POLL_MS = 500;

export type UndeliveredOutboxRow = {
  id: string;
  eventType: string;
  payload: unknown;
};

export async function fetchUndeliveredOutboxRows(
  db: NodePgDatabase<Record<string, unknown>>,
  limit = 50,
): Promise<UndeliveredOutboxRow[]> {
  const rows = await db
    .select({
      id: cockpitSseOutbox.id,
      eventType: cockpitSseOutbox.eventType,
      payloadJson: cockpitSseOutbox.payloadJson,
    })
    .from(cockpitSseOutbox)
    .where(isNull(cockpitSseOutbox.deliveredAt))
    .orderBy(asc(cockpitSseOutbox.createdAt))
    .limit(limit);

  return rows.map((row) => ({
    id: row.id,
    eventType: row.eventType,
    payload: row.payloadJson,
  }));
}

export async function markOutboxRowsDelivered(
  db: NodePgDatabase<Record<string, unknown>>,
  ids: string[],
): Promise<void> {
  if (ids.length === 0) {
    return;
  }
  const deliveredAt = new Date();
  for (const id of ids) {
    await db
      .update(cockpitSseOutbox)
      .set({ deliveredAt })
      .where(and(eq(cockpitSseOutbox.id, id), isNull(cockpitSseOutbox.deliveredAt)));
  }
}

function emitOutboxPayload(eventType: string, payload: unknown): void {
  const bus = getCockpitEventBus();

  if (eventType === "pipeline") {
    const parsed = PipelineEventSchema.safeParse(payload);
    if (parsed.success) {
      bus.emit(parsed.data.type, {
        ...parsed.data,
        simulated: false,
      });
    }
    return;
  }

  if (payload && typeof payload === "object" && "type" in payload) {
    const type = (payload as { type: string }).type;
    bus.emit(type, payload);
  }
}

/** Poll once: emit undelivered outbox rows and mark delivered (ADR-027 Amendment B). */
export async function drainCockpitOutboxOnce(): Promise<number> {
  const db = getDb();
  if (!db) {
    return 0;
  }

  const rows = await fetchUndeliveredOutboxRows(db);
  if (rows.length === 0) {
    return 0;
  }

  const deliveredIds: string[] = [];
  for (const row of rows) {
    emitOutboxPayload(row.eventType, row.payload);
    deliveredIds.push(row.id);
  }

  await markOutboxRowsDelivered(db, deliveredIds);
  return rows.length;
}
