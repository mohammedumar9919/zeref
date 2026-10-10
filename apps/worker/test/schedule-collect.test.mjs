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
  applyWatchSchedule,
  resolveLatestGraphMediaId,
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

  it("interval defaults to every 4 hours, env override clamped to 1–24 (C18b)", () => {
    assert.equal(parseCollectIntervalHours(undefined), 4);
    assert.equal(parseCollectIntervalHours(""), 4);
    assert.equal(parseCollectIntervalHours("abc"), 4);
    assert.equal(collectIntervalCron(parseCollectIntervalHours(undefined)), "0 */4 * * *");
    assert.equal(collectIntervalCron(6), "0 */6 * * *");
    assert.equal(parseCollectIntervalHours("12"), 12);
    assert.equal(collectIntervalCron(parseCollectIntervalHours("12")), "0 */12 * * *");
    assert.equal(parseCollectIntervalHours("0"), 1);
    assert.equal(parseCollectIntervalHours("-3"), 1);
    assert.equal(parseCollectIntervalHours("48"), 24);
    assert.equal(collectIntervalCron(24), "0 0 * * *");
    assert.equal(collectIntervalCron(1), "0 */1 * * *");
  });

  it("applyWatchSchedule schedules only when ZEREF_WATCH_ENABLED=1, else unschedules", async () => {
    const calls = [];
    const boss = {
      schedule: async (...args) => calls.push(["schedule", ...args]),
      unschedule: async (...args) => calls.push(["unschedule", ...args]),
    };

    assert.deepEqual(await applyWatchSchedule(boss, {}), { scheduled: false });
    assert.deepEqual(await applyWatchSchedule(boss, { ZEREF_WATCH_ENABLED: "true" }), {
      scheduled: false,
    });
    assert.deepEqual(calls, [
      ["unschedule", "schedule-collect"],
      ["unschedule", "schedule-collect"],
    ]);

    calls.length = 0;
    const on = await applyWatchSchedule(boss, { ZEREF_WATCH_ENABLED: "1" });
    assert.deepEqual(on, { scheduled: true, cron: "0 */4 * * *", intervalHours: 4 });
    assert.deepEqual(calls, [["schedule", "schedule-collect", "0 */4 * * *", { trigger: "schedule" }]]);

    calls.length = 0;
    await applyWatchSchedule(boss, { ZEREF_WATCH_ENABLED: "1", ZEREF_COLLECT_INTERVAL_HOURS: "99" });
    assert.equal(calls[0][2], "0 0 * * *");
  });

  it("runScheduleCollect resolves newest own media id when no env target (C18b)", async () => {
    const sent = [];
    const result = await runScheduleCollect({
      boss: { send: async () => null },
      accessToken: "test-token",
      shortcodesEnv: "",
      graphMediaIdEnv: "",
      resolveLatestMediaId: async (token) => {
        assert.equal(token, "test-token");
        return "newest-1";
      },
      send: async (name, data) => {
        sent.push({ name, data });
        return "job-9";
      },
    });
    assert.deepEqual(result, { skipped: false, jobId: "job-9" });
    assert.equal(CollectJobInputSchema.parse(sent[0].data).graphMediaId, "newest-1");
  });

  it("resolveLatestGraphMediaId reads /me/media limit=1 and redacts the token on failure", async () => {
    const urls = [];
    const id = await resolveLatestGraphMediaId({
      accessToken: "SECRET_TOKEN_123",
      fetchImpl: async (url) => {
        urls.push(new URL(String(url)));
        return new Response(JSON.stringify({ data: [{ id: "m9" }] }), { status: 200 });
      },
    });
    assert.equal(id, "m9");
    assert.equal(urls[0].pathname, "/me/media");
    assert.equal(urls[0].searchParams.get("limit"), "1");

    await assert.rejects(
      () =>
        resolveLatestGraphMediaId({
          accessToken: "SECRET_TOKEN_123",
          fetchImpl: async () => new Response("echo SECRET_TOKEN_123", { status: 500 }),
        }),
      (err) => !String(err.message).includes("SECRET_TOKEN_123"),
    );
    await assert.rejects(
      () =>
        resolveLatestGraphMediaId({
          accessToken: "t",
          fetchImpl: async () => new Response(JSON.stringify({ data: [] }), { status: 200 }),
        }),
      /no posts/,
    );
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
