import type {
  CalendarEvent,
  JobEnqueueRequestV9,
  NormalizedEntityId,
  ResearchTopicId,
  SnapshotId,
} from "@zeref/contracts";

/** Allowlisted job types for cockpit UI (Amendment F — no collect; N6 adds research). */
export type CalendarUiJobType =
  | "normalize"
  | "embed"
  | "analyze"
  | "report"
  | "research";

export const UI_JOB_TYPES: readonly CalendarUiJobType[] = [
  "normalize",
  "embed",
  "analyze",
  "report",
  "research",
] as const;

/** True when manual enqueue is allowed (Q5 — scheduled time has passed). */
export function isDueForManualEnqueue(scheduledAt: string, now = Date.now()): boolean {
  const at = Date.parse(scheduledAt);
  return Number.isFinite(at) && at <= now;
}

function payloadEntityId(payload: Record<string, unknown>): string | undefined {
  const raw = payload.normalizedEntityId ?? payload.entityId;
  return typeof raw === "string" && raw.length > 0 ? raw : undefined;
}

function payloadSnapshotId(payload: Record<string, unknown>): string | undefined {
  const raw = payload.snapshotId;
  return typeof raw === "string" && raw.length > 0 ? raw : undefined;
}

function payloadTopicId(payload: Record<string, unknown>): string | undefined {
  const raw = payload.topicId;
  return typeof raw === "string" && raw.length > 0 ? raw : undefined;
}

/** Map persisted calendar event → BFF enqueue body (allowlisted types only). */
export function buildEnqueueRequestFromEvent(
  event: CalendarEvent,
): JobEnqueueRequestV9 | null {
  const jobType = event.jobType;
  if (!jobType || !UI_JOB_TYPES.includes(jobType as CalendarUiJobType)) {
    return null;
  }

  const uiJobType = jobType as CalendarUiJobType;
  const payload = event.payload as Record<string, unknown>;
  const base = {
    jobType: uiJobType,
    calendarEventId: event.id,
  };

  switch (uiJobType) {
    case "normalize": {
      const snapshotId = payloadSnapshotId(payload);
      if (!snapshotId) return null;
      return { ...base, snapshotId: snapshotId as SnapshotId };
    }
    case "embed": {
      const entityId = payloadEntityId(payload);
      if (!entityId) return null;
      return { ...base, entityId: entityId as NormalizedEntityId };
    }
    case "analyze":
    case "report": {
      const entityId = payloadEntityId(payload);
      const snapshotId = payloadSnapshotId(payload);
      if (!entityId && !snapshotId) return null;
      return {
        ...base,
        ...(entityId ? { entityId: entityId as NormalizedEntityId } : {}),
        ...(snapshotId ? { snapshotId: snapshotId as SnapshotId } : {}),
      };
    }
    case "research": {
      const topicId = payloadTopicId(payload);
      if (!topicId) return null;
      return { ...base, topicId: topicId as ResearchTopicId };
    }
    default:
      return null;
  }
}

/** ISO datetime for datetime-local input value. */
export function toDatetimeLocalValue(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Parse datetime-local to ISO offset string. */
export function fromDatetimeLocalValue(value: string): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) {
    throw new Error("invalid datetime");
  }
  return d.toISOString();
}

/** Week bucket label for list grouping. */
export function weekBucketLabel(scheduledAt: string): string {
  const d = new Date(scheduledAt);
  if (Number.isNaN(d.getTime())) return "Unscheduled";
  const start = new Date(d);
  start.setHours(0, 0, 0, 0);
  const day = start.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  start.setDate(start.getDate() + diff);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  const fmt = (x: Date) =>
    x.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  return `Week ${fmt(start)} – ${fmt(end)}`;
}

export function groupEventsByWeek(events: CalendarEvent[]): Map<string, CalendarEvent[]> {
  const sorted = [...events].sort(
    (a, b) => Date.parse(b.scheduledAt) - Date.parse(a.scheduledAt),
  );
  const map = new Map<string, CalendarEvent[]>();
  for (const event of sorted) {
    const key = weekBucketLabel(event.scheduledAt);
    const bucket = map.get(key) ?? [];
    bucket.push(event);
    map.set(key, bucket);
  }
  return map;
}
