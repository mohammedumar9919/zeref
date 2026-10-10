import assert from "node:assert/strict";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

const testDir = dirname(fileURLToPath(import.meta.url));
const workerRoot = join(testDir, "..");

const {
  extractPostMetrics,
  diffSnapshotPair,
  diffMediaLists,
  isWatchEnabled,
  parseGraphDailyCap,
  parseWatchTrigger,
  parseWatchCliArgs,
  utcDayStart,
  DEFAULT_GRAPH_DAILY_CAP,
} = await import(pathToFileURL(join(workerRoot, "dist/index.js")).href);

const snap = (id, at, payloadJson, sourceRef = "instagram:post:ABC") => ({
  id,
  sourceRef,
  collectedAt: new Date(at),
  payloadJson,
});

describe("watch diff", () => {
  it("extractPostMetrics prefers graph counts and keeps absent metrics absent", () => {
    assert.deepEqual(
      extractPostMetrics({ graph: { like_count: 4, comments_count: 1 }, scrape: { likes: 9 } }),
      { likes: 4, comments: 1 },
    );
    assert.deepEqual(extractPostMetrics({ scrape: { likes: 9, comments: 2 } }), {
      likes: 9,
      comments: 2,
    });
    assert.deepEqual(
      extractPostMetrics({ graph: { like_count: 1 }, insights: { reach: 50, impressions: 70 } }),
      { likes: 1, reach: 50, impressions: 70 },
    );
    assert.deepEqual(extractPostMetrics(null), {});
    assert.deepEqual(extractPostMetrics({ graph: { like_count: "7" } }), {});
  });

  it("diffSnapshotPair includes both collectedAt values and real deltas only", () => {
    const d = diffSnapshotPair(
      snap("b", "2026-10-09T12:00:00Z", { graph: { like_count: 12, comments_count: 2 }, insights: { reach: 30 } }),
      snap("a", "2026-10-09T08:00:00Z", { graph: { like_count: 10, comments_count: 3 } }),
      { newThisRun: true },
    );
    assert.equal(d.status, "changed");
    assert.equal(d.shortcode, "ABC");
    assert.equal(d.latestCollectedAt, "2026-10-09T12:00:00.000Z");
    assert.equal(d.previousCollectedAt, "2026-10-09T08:00:00.000Z");
    assert.deepEqual(d.delta, { likes: 2, comments: -1 });
  });

  it("diffSnapshotPair first_seen / unchanged", () => {
    const first = diffSnapshotPair(snap("a", "2026-10-09T08:00:00Z", {}), undefined, {
      newThisRun: true,
    });
    assert.equal(first.status, "first_seen");
    assert.equal(first.previousCollectedAt, null);
    const same = diffSnapshotPair(
      snap("b", "2026-10-09T12:00:00Z", { graph: { like_count: 12 } }),
      snap("a", "2026-10-09T08:00:00Z", { graph: { like_count: 10 } }),
      { newThisRun: false },
    );
    assert.equal(same.status, "unchanged");
    assert.deepEqual(same.delta, {});
  });

  it("diffMediaLists: baseline, new posts, removed vs scrolled out of a full window", () => {
    assert.deepEqual(diffMediaLists([{ id: "x" }], null, { windowFull: false }), {
      newPosts: [],
      removedPosts: [],
    });
    const current = [
      { id: "n", timestamp: "2026-10-09T10:00:00Z" },
      { id: "k", timestamp: "2026-10-08T10:00:00Z" },
    ];
    const previous = [
      { id: "k", timestamp: "2026-10-08T10:00:00Z" },
      { id: "del", timestamp: "2026-10-08T12:00:00Z" },
      { id: "old", timestamp: "2026-10-01T10:00:00Z" },
    ];
    const full = diffMediaLists(current, previous, { windowFull: true });
    assert.deepEqual(full.newPosts.map((m) => m.id), ["n"]);
    assert.deepEqual(full.removedPosts.map((m) => m.id), ["del"]);
    const partial = diffMediaLists(current, previous, { windowFull: false });
    assert.deepEqual(partial.removedPosts.map((m) => m.id), ["del", "old"]);
  });
});

describe("watch config", () => {
  it("isWatchEnabled only for exactly 1", () => {
    assert.equal(isWatchEnabled({ ZEREF_WATCH_ENABLED: "1" }), true);
    assert.equal(isWatchEnabled({ ZEREF_WATCH_ENABLED: " 1 " }), true);
    for (const v of [undefined, "", "0", "true", "yes"]) {
      assert.equal(isWatchEnabled({ ZEREF_WATCH_ENABLED: v }), false);
    }
  });

  it("parseGraphDailyCap defaults to 200", () => {
    assert.equal(DEFAULT_GRAPH_DAILY_CAP, 200);
    assert.equal(parseGraphDailyCap(undefined), 200);
    assert.equal(parseGraphDailyCap("abc"), 200);
    assert.equal(parseGraphDailyCap("-5"), 200);
    assert.equal(parseGraphDailyCap("50"), 50);
    assert.equal(parseGraphDailyCap("0"), 0);
  });

  it("parseWatchTrigger defaults to schedule", () => {
    assert.equal(parseWatchTrigger({}), "schedule");
    assert.equal(parseWatchTrigger(null), "schedule");
    assert.equal(parseWatchTrigger({ trigger: "bogus" }), "schedule");
    assert.equal(parseWatchTrigger({ trigger: "task_scheduler" }), "task_scheduler");
    assert.equal(parseWatchTrigger({ trigger: "on_demand" }), "on_demand");
  });

  it("parseWatchCliArgs", () => {
    assert.deepEqual(parseWatchCliArgs([]), { trigger: "task_scheduler", direct: false, help: false });
    assert.deepEqual(parseWatchCliArgs(["--trigger", "on_demand", "--direct"]), {
      trigger: "on_demand",
      direct: true,
      help: false,
    });
    assert.throws(() => parseWatchCliArgs(["--trigger", "nope"]), /--trigger/);
    assert.throws(() => parseWatchCliArgs(["--token", "x"]), /unknown argument/);
  });

  it("utcDayStart", () => {
    assert.equal(
      utcDayStart(new Date("2026-10-09T23:59:59.999Z")).toISOString(),
      "2026-10-09T00:00:00.000Z",
    );
  });
});
