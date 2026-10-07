import assert from "node:assert/strict";
import { dirname, join } from "node:path";
import { after, afterEach, before, describe, it } from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

const testDir = dirname(fileURLToPath(import.meta.url));
const webRoot = join(testDir, "..");
const repoRoot = join(webRoot, "../..");

const contracts = await import(
  pathToFileURL(join(repoRoot, "packages/contracts/dist/index.js")).href
);
const jobsEnqueueRoute = await import(
  pathToFileURL(join(webRoot, "app/api/v1/jobs/enqueue/route.ts")).href
);
const enqueueJobModule = await import(
  pathToFileURL(join(webRoot, "lib/jobs/enqueue-job.ts")).href
);

const { enqueueJob, buildWorkerJobPayload } = enqueueJobModule;

const ENV_KEYS = [
  "ZEREF_BFF_FIXTURE",
  "ZEREF_JOB_ENQUEUE_MOCK",
  "ZEREF_PHASE9_RESEARCH",
  "ZEREF_WORKER_AVAILABLE",
  "DATABASE_URL",
];

function clearEnv() {
  for (const key of ENV_KEYS) delete process.env[key];
}

function postEnqueue(body) {
  return jobsEnqueueRoute.POST(
    new Request("http://localhost/api/v1/jobs/enqueue", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  );
}

describe("enqueueJob via jarvis-confirmed (CLOUD-C2)", () => {
  before(() => {
    clearEnv();
    process.env.ZEREF_BFF_FIXTURE = "1";
    process.env.ZEREF_JOB_ENQUEUE_MOCK = "1";
  });

  afterEach(() => {
    delete process.env.ZEREF_PHASE9_RESEARCH;
  });

  after(() => {
    clearEnv();
  });

  it("rejects collect without via (default UI allowlist)", async () => {
    await assert.rejects(
      () => enqueueJob({ jobType: "collect" }),
      (error) => error instanceof Error && error.name === "ZodError",
    );
  });

  it("rejects collect with an unknown via value", async () => {
    await assert.rejects(
      () => enqueueJob({ jobType: "collect" }, { via: "ui" }),
      (error) => error instanceof Error && error.name === "ZodError",
    );
  });

  it("accepts collect via jarvis-confirmed and returns a SIMULATED result in mock mode", async () => {
    const result = await enqueueJob({ jobType: "collect" }, { via: "jarvis-confirmed" });
    assert.equal(result.mocked, true);
    assert.equal(result.queued, true);
    assert.equal(result.workerConsuming, false);
    assert.equal(typeof result.jobId, "string");
  });

  it("still validates the Jarvis body strictly (unknown keys rejected)", async () => {
    await assert.rejects(
      () => enqueueJob({ jobType: "collect", password: "x" }, { via: "jarvis-confirmed" }),
      (error) => error instanceof Error && error.name === "ZodError",
    );
  });

  it("keeps research reachable via Jarvis when phase 9 is active", async () => {
    process.env.ZEREF_PHASE9_RESEARCH = "1";
    const research = await enqueueJob({ jobType: "research" }, { via: "jarvis-confirmed" });
    assert.equal(research.mocked, true);
    const collect = await enqueueJob({ jobType: "collect" }, { via: "jarvis-confirmed" });
    assert.equal(collect.mocked, true);
    await assert.rejects(() => enqueueJob({ jobType: "collect" }));
  });

  it("POST /api/v1/jobs/enqueue still rejects collect with 400 (regression)", async () => {
    const response = await postEnqueue({ jobType: "collect" });
    assert.equal(response.status, 400);
    process.env.ZEREF_PHASE9_RESEARCH = "1";
    const v9 = await postEnqueue({ jobType: "collect" });
    assert.equal(v9.status, 400);
  });

  it("UI allowlist schemas never contain collect", () => {
    assert.equal(contracts.UiJobTypeSchema.safeParse("collect").success, false);
    assert.equal(contracts.JobEnqueueRequestSchema.safeParse({ jobType: "collect" }).success, false);
    assert.equal(contracts.JarvisJobTypeSchema.safeParse("collect").success, true);
    assert.equal(contracts.JarvisJobTypeSchemaV9.safeParse("research").success, true);
    assert.equal(contracts.JarvisJobTypeSchema.safeParse("research").success, false);
  });

  it("buildWorkerJobPayload maps collect to a valid worker CollectJobInput", () => {
    const payload = buildWorkerJobPayload({ jobType: "collect", graphMediaId: "17900000000000001" });
    const parsed = contracts.CollectJobInputSchema.parse(payload);
    assert.equal(parsed.kind, "instagram_post_raw");
    assert.deepEqual(parsed.sources, ["graph"]);
    assert.equal(parsed.graphMediaId, "17900000000000001");
  });

  it("buildWorkerJobPayload requires a collect target", () => {
    assert.throws(
      () => buildWorkerJobPayload({ jobType: "collect" }),
      /graphMediaId or shortcodes is required for collect jobs/,
    );
  });
});
