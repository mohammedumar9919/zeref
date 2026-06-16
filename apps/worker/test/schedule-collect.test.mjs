import assert from "node:assert/strict";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

const testDir = dirname(fileURLToPath(import.meta.url));
const workerRoot = join(testDir, "..");

const worker = await import(pathToFileURL(join(workerRoot, "dist/index.js")).href);

const {
  WORKER_JOB_NAMES,
  SCHEDULE_COLLECT_JOB_NAME,
  COLLECT_JOB_NAME,
  buildScheduleCollectInput,
  parseCollectShortcodes,
  collectIntervalCron,
  parseCollectIntervalHours,
  runScheduleCollect,
} = worker;

const contracts = await import(
  pathToFileURL(join(workerRoot, "../../packages/contracts/dist/index.js")).href
);
const { CollectJobInputSchema } = contracts;

describe("schedule-collect", () => {
  it("registers schedule-collect in WORKER_JOB_NAMES", () => {
    assert.equal(SCHEDULE_COLLECT_JOB_NAME, "schedule-collect");
    assert.ok(WORKER_JOB_NAMES.includes("schedule-collect"));
    assert.ok(WORKER_JOB_NAMES.includes(COLLECT_JOB_NAME));
  });

  it("collectIntervalCron defaults to every 6 hours", () => {
    assert.equal(collectIntervalCron(6), "0 */6 * * *");
    assert.equal(parseCollectIntervalHours(undefined), 6);
    assert.equal(parseCollectIntervalHours("12"), 12);
    assert.equal(collectIntervalCron(parseCollectIntervalHours("12")), "0 */12 * * *");
  });

  it("parseCollectShortcodes splits comma-separated env values", () => {
    assert.deepEqual(parseCollectShortcodes("ABC123, DEF456 ,ABC123"), [
      "ABC123",
      "DEF456",
    ]);
    assert.deepEqual(parseCollectShortcodes(""), []);
  });

  it("buildScheduleCollectInput validates as graph instagram_post_raw", () => {
    const input = CollectJobInputSchema.parse(
      buildScheduleCollectInput({
        shortcodes: "ABC123,DEF456",
        graphMediaId: "18123456789012345",
      }),
    );
    assert.equal(input.jobType, "collect");
    assert.equal(input.kind, "instagram_post_raw");
    assert.deepEqual(input.sources, ["graph"]);
    assert.deepEqual(input.shortcodes, ["ABC123", "DEF456"]);
    assert.equal(input.graphMediaId, "18123456789012345");
  });

  it("runScheduleCollect skips when INSTAGRAM_ACCESS_TOKEN missing", async () => {
    const prev = process.env.INSTAGRAM_ACCESS_TOKEN;
    delete process.env.INSTAGRAM_ACCESS_TOKEN;

    try {
      const result = await runScheduleCollect({
        boss: { send: async () => "should-not-run" },
        accessToken: undefined,
      });
      assert.deepEqual(result, { skipped: true, reason: "missing_token" });
    } finally {
      if (prev === undefined) delete process.env.INSTAGRAM_ACCESS_TOKEN;
      else process.env.INSTAGRAM_ACCESS_TOKEN = prev;
    }
  });

  it("runScheduleCollect enqueues collect with validated input (mock send)", async () => {
    const sent = [];
    const result = await runScheduleCollect({
      boss: { send: async () => null },
      accessToken: "test-token",
      shortcodesEnv: "ABC123",
      graphMediaIdEnv: "media-99",
      send: async (name, data) => {
        sent.push({ name, data });
        return "job-123";
      },
    });

    assert.deepEqual(result, { skipped: false, jobId: "job-123" });
    assert.equal(sent.length, 1);
    assert.equal(sent[0].name, COLLECT_JOB_NAME);

    const parsed = CollectJobInputSchema.parse(sent[0].data);
    assert.equal(parsed.kind, "instagram_post_raw");
    assert.deepEqual(parsed.sources, ["graph"]);
    assert.deepEqual(parsed.shortcodes, ["ABC123"]);
    assert.equal(parsed.graphMediaId, "media-99");
  });
});
