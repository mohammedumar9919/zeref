import assert from "node:assert/strict";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

const utilsDir = dirname(fileURLToPath(import.meta.url));
const utils = await import(
  pathToFileURL(join(utilsDir, "calendar-scheduler-utils.ts")).href
);

const {
  buildEnqueueRequestFromEvent,
  fromDatetimeLocalValue,
  isDueForManualEnqueue,
  UI_JOB_TYPES,
  weekBucketLabel,
} = utils;

const fixtureEvent = {
  id: "660e8400-e29b-41d4-a716-446655440010",
  title: "Embed scheduled post",
  scheduledAt: "2026-06-10T18:00:00.000Z",
  jobType: "embed",
  payload: { normalizedEntityId: "550e8400-e29b-41d4-a716-446655440001" },
  status: "scheduled",
  createdAt: "2026-06-03T10:00:00.000Z",
  updatedAt: "2026-06-03T10:00:00.000Z",
};

test("UI_JOB_TYPES excludes collect", () => {
  assert.ok(!UI_JOB_TYPES.includes("collect"));
});

test("isDueForManualEnqueue when scheduledAt <= now", () => {
  const past = new Date(Date.now() - 60_000).toISOString();
  assert.equal(isDueForManualEnqueue(past), true);
  const future = new Date(Date.now() + 3600_000).toISOString();
  assert.equal(isDueForManualEnqueue(future), false);
});

test("buildEnqueueRequestFromEvent maps embed payload", () => {
  const body = buildEnqueueRequestFromEvent(fixtureEvent);
  assert.deepEqual(body, {
    jobType: "embed",
    calendarEventId: fixtureEvent.id,
    entityId: "550e8400-e29b-41d4-a716-446655440001",
  });
});

test("buildEnqueueRequestFromEvent rejects collect", () => {
  const body = buildEnqueueRequestFromEvent({
    ...fixtureEvent,
    jobType: "collect",
  });
  assert.equal(body, null);
});

test("fromDatetimeLocalValue returns ISO", () => {
  const iso = fromDatetimeLocalValue("2026-06-10T14:00");
  assert.ok(iso.includes("2026-06-10"));
});

test("weekBucketLabel returns readable range", () => {
  const label = weekBucketLabel("2026-06-10T18:00:00.000Z");
  assert.match(label, /^Week /);
});
