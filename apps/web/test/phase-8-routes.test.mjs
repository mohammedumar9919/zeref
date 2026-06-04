import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { after, before, describe, it } from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

const testDir = dirname(fileURLToPath(import.meta.url));
const webRoot = join(testDir, "..");
const repoRoot = join(webRoot, "../..");
const fixturesRoot = join(repoRoot, "fixtures/phase-8");

const contracts = await import(
  pathToFileURL(join(repoRoot, "packages/contracts/dist/index.js")).href
);

const studioEntityRoute = await import(
  pathToFileURL(join(webRoot, "app/api/v1/studio/entities/[id]/route.ts")).href
);
const studioDraftRoute = await import(
  pathToFileURL(join(webRoot, "app/api/v1/studio/drafts/[entityId]/route.ts")).href
);
const calendarEventsRoute = await import(
  pathToFileURL(join(webRoot, "app/api/v1/calendar/events/route.ts")).href
);
const calendarEventByIdRoute = await import(
  pathToFileURL(join(webRoot, "app/api/v1/calendar/events/[id]/route.ts")).href
);
const jobsEnqueueRoute = await import(
  pathToFileURL(join(webRoot, "app/api/v1/jobs/enqueue/route.ts")).href
);
const enqueueJob = await import(
  pathToFileURL(join(webRoot, "lib/jobs/enqueue-job.ts")).href
);
const cockpitBff = await import(pathToFileURL(join(webRoot, "lib/cockpit-bff.ts")).href);

const FIXTURE_ENTITY_ID = "550e8400-e29b-41d4-a716-446655440001";
const FIXTURE_CALENDAR_ID = "660e8400-e29b-41d4-a716-446655440010";
const UNKNOWN_ID = "00000000-0000-4000-8000-000000009999";

function loadFixture(name) {
  return JSON.parse(readFileSync(join(fixturesRoot, name), "utf8"));
}

function clearPhase8Env() {
  delete process.env.ZEREF_BFF_FIXTURE;
  delete process.env.ZEREF_JOB_ENQUEUE_MOCK;
  delete process.env.ZEREF_WORKER_AVAILABLE;
  delete process.env.DATABASE_URL;
}

describe("phase 8 BFF (fixture mode)", () => {
  before(() => {
    clearPhase8Env();
    process.env.ZEREF_BFF_FIXTURE = "1";
    enqueueJob.resetPhase8FixtureStateForTests();
  });

  after(() => {
    clearPhase8Env();
    enqueueJob.resetPhase8FixtureStateForTests();
  });

  it("loadCockpitSlices returns phase8-cockpit-v1", async () => {
    const slices = await cockpitBff.loadCockpitSlices();
    const parsed = contracts.CockpitSlicesSchemaV8.parse(slices);
    assert.equal(parsed.schemaVersion, "phase8-cockpit-v1");
    assert.equal(parsed.panels.studio.items[0]?.hasDraft, true);
    assert.equal(parsed.panels.calendar.items.length, 1);
  });

  it("GET studio entity returns normalized summary + draft overlay", async () => {
    const response = await studioEntityRoute.GET(new Request("http://localhost"), {
      params: Promise.resolve({ id: FIXTURE_ENTITY_ID }),
    });
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.entityId, FIXTURE_ENTITY_ID);
    assert.ok(body.title);
    assert.ok(body.payload);
    contracts.StudioDraftSchema.parse(body.draft);
  });

  it("GET studio entity returns 404 for unknown id", async () => {
    const response = await studioEntityRoute.GET(new Request("http://localhost"), {
      params: Promise.resolve({ id: UNKNOWN_ID }),
    });
    assert.equal(response.status, 404);
  });

  it("PUT studio draft upserts without snapshot write", async () => {
    const response = await studioDraftRoute.PUT(
      new Request("http://localhost", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          caption: "Updated fixture caption",
          notes: "fixture notes",
          tags: ["fixture"],
        }),
      }),
      { params: Promise.resolve({ entityId: FIXTURE_ENTITY_ID }) },
    );
    assert.equal(response.status, 200);
    const body = await response.json();
    contracts.StudioDraftSchema.parse(body);
    assert.equal(body.caption, "Updated fixture caption");

    const reload = await studioEntityRoute.GET(new Request("http://localhost"), {
      params: Promise.resolve({ id: FIXTURE_ENTITY_ID }),
    });
    const detail = await reload.json();
    assert.equal(detail.draft.caption, "Updated fixture caption");
  });

  it("GET calendar events lists fixture events", async () => {
    const response = await calendarEventsRoute.GET(new Request("http://localhost"));
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.ok(Array.isArray(body.events));
    assert.equal(body.events.length, 1);
    contracts.CalendarEventSchema.parse(body.events[0]);
  });

  it("POST calendar event creates event", async () => {
    const response = await calendarEventsRoute.POST(
      new Request("http://localhost", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title: "New fixture event",
          scheduledAt: "2026-06-15T12:00:00.000Z",
          status: "draft",
        }),
      }),
    );
    assert.equal(response.status, 201);
    const created = await response.json();
    contracts.CalendarEventSchema.parse(created);
    assert.equal(created.title, "New fixture event");
  });

  it("PATCH calendar event updates event", async () => {
    const response = await calendarEventByIdRoute.PATCH(
      new Request("http://localhost", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status: "completed" }),
      }),
      { params: Promise.resolve({ id: FIXTURE_CALENDAR_ID }) },
    );
    assert.equal(response.status, 200);
    const updated = await response.json();
    assert.equal(updated.status, "completed");
  });

  it("POST jobs enqueue mock returns jobId", async () => {
    process.env.ZEREF_JOB_ENQUEUE_MOCK = "1";
    const response = await jobsEnqueueRoute.POST(
      new Request("http://localhost", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(loadFixture("job-enqueue.valid.json")),
      }),
    );
    assert.equal(response.status, 202);
    const body = await response.json();
    assert.ok(body.jobId);
    assert.equal(body.queued, true);
    assert.equal(body.workerConsuming, false);
    assert.equal(body.mocked, true);
  });

  it("POST jobs enqueue rejects collect with 400", async () => {
    process.env.ZEREF_JOB_ENQUEUE_MOCK = "1";
    const response = await jobsEnqueueRoute.POST(
      new Request("http://localhost", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          jobType: "collect",
          snapshotId: "550e8400-e29b-41d4-a716-446655440002",
        }),
      }),
    );
    assert.equal(response.status, 400);
  });

  it("enqueueJob mock helper returns mocked result", async () => {
    process.env.ZEREF_JOB_ENQUEUE_MOCK = "1";
    const result = await enqueueJob.enqueueJob(
      contracts.JobEnqueueRequestSchema.parse(loadFixture("job-enqueue.valid.json")),
    );
    assert.ok(result.jobId);
    assert.equal(result.mocked, true);
    assert.equal(result.queued, true);
    assert.equal(result.workerConsuming, false);
  });
});
