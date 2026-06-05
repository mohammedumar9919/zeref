import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { after, before, describe, it } from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

const testDir = dirname(fileURLToPath(import.meta.url));
const webRoot = join(testDir, "..");
const repoRoot = join(webRoot, "../..");
const fixturesRoot = join(repoRoot, "fixtures/phase-9");

const contracts = await import(
  pathToFileURL(join(repoRoot, "packages/contracts/dist/index.js")).href
);

const researchTopicsRoute = await import(
  pathToFileURL(join(webRoot, "app/api/v1/research/topics/route.ts")).href
);
const researchTopicByIdRoute = await import(
  pathToFileURL(join(webRoot, "app/api/v1/research/topics/[id]/route.ts")).href
);
const enqueueJob = await import(
  pathToFileURL(join(webRoot, "lib/jobs/enqueue-job.ts")).href
);
const cockpitBff = await import(pathToFileURL(join(webRoot, "lib/cockpit-bff.ts")).href);
const researchBff = await import(pathToFileURL(join(webRoot, "lib/research-bff.ts")).href);

const FIXTURE_TOPIC_ID = "770e8400-e29b-41d4-a716-446655440001";
const UNKNOWN_ID = "00000000-0000-4000-8000-000000009999";

function loadFixture(name) {
  return JSON.parse(readFileSync(join(fixturesRoot, name), "utf8"));
}

function clearPhase9Env() {
  delete process.env.ZEREF_BFF_FIXTURE;
  delete process.env.ZEREF_PHASE9_RESEARCH;
  delete process.env.ZEREF_JOB_ENQUEUE_MOCK;
  delete process.env.ZEREF_WORKER_AVAILABLE;
  delete process.env.DATABASE_URL;
}

describe("phase 9 BFF (fixture mode)", () => {
  before(() => {
    clearPhase9Env();
    process.env.ZEREF_BFF_FIXTURE = "1";
    process.env.ZEREF_PHASE9_RESEARCH = "1";
    enqueueJob.resetPhase9FixtureStateForTests();
  });

  after(() => {
    clearPhase9Env();
    enqueueJob.resetPhase9FixtureStateForTests();
  });

  it("loadCockpitSlices returns phase9-cockpit-v1 with research panel", async () => {
    const slices = await cockpitBff.loadCockpitSlices();
    const parsed = contracts.CockpitSlicesSchemaV9.parse(slices);
    assert.equal(parsed.schemaVersion, "phase9-cockpit-v1");
    assert.equal(parsed.panels.research.insufficientData, false);
    assert.equal(parsed.panels.research.items[0]?.id, FIXTURE_TOPIC_ID);
    assert.equal(parsed.panels.research.items[0]?.signalCount, 2);
  });

  it("GET research topics lists fixture topics", async () => {
    const response = await researchTopicsRoute.GET(new Request("http://localhost"));
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.ok(Array.isArray(body.topics));
    assert.equal(body.topics.length, 1);
    contracts.ResearchTopicSchema.parse(body.topics[0]);
    assert.equal(body.topics[0].id, FIXTURE_TOPIC_ID);
  });

  it("GET research topic detail returns topic + signals", async () => {
    const response = await researchTopicByIdRoute.GET(new Request("http://localhost"), {
      params: Promise.resolve({ id: FIXTURE_TOPIC_ID }),
    });
    assert.equal(response.status, 200);
    const body = await response.json();
    contracts.ResearchTopicDetailSchema.parse(body);
    assert.equal(body.topic.id, FIXTURE_TOPIC_ID);
    assert.equal(body.signals.length, 2);
  });

  it("GET research topic detail returns 404 for unknown id", async () => {
    const response = await researchTopicByIdRoute.GET(new Request("http://localhost"), {
      params: Promise.resolve({ id: UNKNOWN_ID }),
    });
    assert.equal(response.status, 404);
  });

  it("POST research topics creates topic seed", async () => {
    const response = await researchTopicsRoute.POST(
      new Request("http://localhost", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title: "New fixture research topic",
          scopeEntityId: "550e8400-e29b-41d4-a716-446655440001",
        }),
      }),
    );
    assert.equal(response.status, 201);
    const created = await response.json();
    contracts.ResearchTopicSchema.parse(created);
    assert.equal(created.title, "New fixture research topic");
    assert.equal(created.signalCount, 0);

    const list = await researchTopicsRoute.GET(new Request("http://localhost"));
    const body = await list.json();
    assert.equal(body.topics.length, 2);
  });

  it("enqueueJob mock accepts research job (Amendment L)", async () => {
    process.env.ZEREF_JOB_ENQUEUE_MOCK = "1";
    const result = await enqueueJob.enqueueJob(
      contracts.JobEnqueueRequestSchemaV9.parse(loadFixture("research-job-input.valid.json")),
    );
    assert.ok(result.jobId);
    assert.equal(result.mocked, true);
    assert.equal(result.queued, true);
  });

  it("buildWorkerJobPayload maps research enqueue to worker input", () => {
    const payload = enqueueJob.buildWorkerJobPayload(
      contracts.JobEnqueueRequestSchemaV9.parse(loadFixture("research-job-input.valid.json")),
    );
    contracts.ResearchJobInputSchema.parse(payload);
    assert.equal(payload.jobType, "research");
    assert.equal(payload.topicId, FIXTURE_TOPIC_ID);
  });

  it("resetResearchFixtureStateForTests restores seed topics", async () => {
    researchBff.resetResearchFixtureStateForTests();
    const response = await researchTopicsRoute.GET(new Request("http://localhost"));
    const body = await response.json();
    assert.equal(body.topics.length, 1);
    assert.equal(body.topics[0].id, FIXTURE_TOPIC_ID);
  });
});
