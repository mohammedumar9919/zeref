import assert from "node:assert/strict";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

const testDir = dirname(fileURLToPath(import.meta.url));
const workerRoot = join(testDir, "..");

const worker = await import(pathToFileURL(join(workerRoot, "dist/index.js")).href);
const {
  runWatch,
  createWatchJobHandler,
  buildWatchCollectInput,
  watchErrorCode,
  WATCH_MEDIA_WINDOW,
} = worker;

const instagram = await import(
  pathToFileURL(join(workerRoot, "../../packages/instagram/dist/index.js")).href
);
const { GraphThrottledError } = instagram;

const SECRET = "SECRET_TOKEN_123";
const APP_SECRET = "APP_SECRET_456";
const T0 = new Date("2026-10-09T12:00:00.000Z");
const PREV_AT = new Date("2026-10-09T08:00:00.000Z");

function clock(start = T0) {
  let t = start.getTime();
  return () => new Date((t += 1000));
}

function fakeStore(opts = {}) {
  const runs = [];
  const snapshots = opts.snapshots ?? new Map();
  let locked = opts.locked ?? false;
  const store = {
    runs,
    snapshots,
    releases: 0,
    lockAttempts: 0,
    sinceArgs: [],
    async tryAcquireLock() {
      store.lockAttempts += 1;
      if (locked) return null;
      locked = true;
      return {
        async release() {
          locked = false;
          store.releases += 1;
        },
      };
    },
    async insertRun(row) {
      const id = `run-${runs.length + 1}`;
      runs.push({ id, ...row });
      return id;
    },
    async finishRun(id, patch) {
      Object.assign(runs.find((r) => r.id === id), patch);
    },
    async graphCallsSince(since) {
      store.sinceArgs.push(since);
      return opts.usedToday ?? 0;
    },
    async tokenCheckedSince() {
      return opts.tokenCheckedToday ?? false;
    },
    async lastMediaList() {
      return opts.previousList ?? null;
    },
    async latestSnapshots(ref, limit) {
      return (snapshots.get(ref) ?? []).slice(0, limit);
    },
  };
  return store;
}

const MEDIA = [
  { id: "m3", timestamp: "2026-10-09T10:00:00+0000", permalink: "https://www.instagram.com/p/NEW3/" },
  { id: "m2", timestamp: "2026-10-08T10:00:00+0000", permalink: "https://www.instagram.com/p/OLD2/" },
];

function json(body, init = {}) {
  return new Response(JSON.stringify(body), {
    status: init.status ?? 200,
    headers: { "content-type": "application/json", ...(init.headers ?? {}) },
  });
}

function fakeFetch(opts = {}) {
  const calls = [];
  const fetchImpl = async (input) => {
    const url = new URL(String(input));
    calls.push(url);
    if (url.pathname.endsWith("/debug_token")) {
      if (opts.debugFails) return json({ error: { message: `bad token ${SECRET}` } }, { status: 400 });
      return json({ data: { is_valid: true, expires_at: opts.expiresAtSec ?? 0 } });
    }
    if (url.pathname.endsWith("/media")) {
      if (opts.mediaStatus === 429) return new Response("rate", { status: 429, headers: { "retry-after": "120" } });
      return json({ data: opts.media ?? MEDIA }, { headers: opts.usageHeaders ?? {} });
    }
    return new Response("not found", { status: 404 });
  };
  return { fetchImpl, calls };
}

/** Fake collect: one Graph call through the shared budget, then a new snapshot (likes changed). */
function fakeCollect(store, now, opts = {}) {
  const inputs = [];
  const collect = async (input, graph) => {
    inputs.push(input);
    if (opts.beforeCall) await opts.beforeCall();
    if (!graph.budget.tryConsume()) throw new GraphThrottledError("daily_cap");
    if (opts.throwError) throw opts.throwError;
    const sourceRef = "instagram:post:NEW3";
    if (opts.dedupe) {
      return [{ sourceRef, snapshotId: store.snapshots.get(sourceRef)[0].id }];
    }
    const snap = {
      id: `snap-${inputs.length}`,
      sourceRef,
      collectedAt: now(),
      payloadJson: { shortcode: "NEW3", graph: { like_count: 15, comments_count: 3 } },
    };
    store.snapshots.set(sourceRef, [snap, ...(store.snapshots.get(sourceRef) ?? [])]);
    return [{ sourceRef, snapshotId: snap.id }];
  };
  return { collect, inputs };
}

function previousSnapshots() {
  return new Map([
    [
      "instagram:post:NEW3",
      [
        {
          id: "snap-prev",
          sourceRef: "instagram:post:NEW3",
          collectedAt: PREV_AT,
          payloadJson: { shortcode: "NEW3", graph: { like_count: 10, comments_count: 3 } },
        },
      ],
    ],
  ]);
}

function captureLog() {
  const lines = [];
  return { lines, log: { info: (m) => lines.push(m), warn: (m) => lines.push(m) } };
}

const ENABLED = { ZEREF_WATCH_ENABLED: "1", INSTAGRAM_ACCESS_TOKEN: SECRET };

describe("runWatch gating", () => {
  it("schedule trigger with watch disabled records skipped_disabled and calls nothing", async () => {
    const store = fakeStore();
    const { fetchImpl, calls } = fakeFetch();
    const { collect, inputs } = fakeCollect(store, clock());
    const res = await runWatch({
      store,
      trigger: "schedule",
      env: { INSTAGRAM_ACCESS_TOKEN: SECRET },
      graphFetch: fetchImpl,
      collect,
      now: clock(),
      log: captureLog().log,
    });
    assert.equal(res.status, "skipped_disabled");
    assert.equal(store.runs.length, 1);
    assert.equal(store.runs[0].status, "skipped_disabled");
    assert.ok(store.runs[0].finishedAt instanceof Date);
    assert.equal(store.lockAttempts, 0);
    assert.equal(calls.length, 0);
    assert.equal(inputs.length, 0);
  });

  it("task_scheduler also requires ZEREF_WATCH_ENABLED=1; on_demand does not", async () => {
    const off = await runWatch({
      store: fakeStore(),
      trigger: "task_scheduler",
      env: { ZEREF_WATCH_ENABLED: "0", INSTAGRAM_ACCESS_TOKEN: SECRET },
      collect: async () => [],
      log: captureLog().log,
    });
    assert.equal(off.status, "skipped_disabled");

    const store = fakeStore();
    const now = clock();
    const { fetchImpl } = fakeFetch();
    const on = await runWatch({
      store,
      trigger: "on_demand",
      env: { INSTAGRAM_ACCESS_TOKEN: SECRET },
      graphFetch: fetchImpl,
      collect: fakeCollect(store, now).collect,
      now,
      log: captureLog().log,
    });
    assert.equal(on.status, "ok");
    assert.equal(store.runs[0].trigger, "on_demand");
  });

  it("missing token records skipped_no_token", async () => {
    const store = fakeStore();
    const res = await runWatch({
      store,
      trigger: "schedule",
      env: { ZEREF_WATCH_ENABLED: "1", INSTAGRAM_ACCESS_TOKEN: "  " },
      collect: async () => [],
      log: captureLog().log,
    });
    assert.equal(res.status, "skipped_no_token");
    assert.equal(store.runs[0].status, "skipped_no_token");
    assert.equal(store.lockAttempts, 0);
  });

  it("held advisory lock records skipped_locked without Graph calls", async () => {
    const store = fakeStore({ locked: true });
    const { fetchImpl, calls } = fakeFetch();
    const res = await runWatch({
      store,
      trigger: "schedule",
      env: ENABLED,
      graphFetch: fetchImpl,
      collect: async () => {
        throw new Error("must not collect");
      },
      log: captureLog().log,
    });
    assert.equal(res.status, "skipped_locked");
    assert.equal(store.runs.length, 1);
    assert.equal(store.runs[0].status, "skipped_locked");
    assert.equal(calls.length, 0);
  });

  it("a second concurrent trigger is skipped_locked while the first runs", async () => {
    const store = fakeStore({ snapshots: previousSnapshots() });
    const now = clock();
    const { fetchImpl } = fakeFetch();
    let releaseFirst;
    const gate = new Promise((r) => (releaseFirst = r));
    let signalStarted;
    const started = new Promise((r) => (signalStarted = r));
    const { collect } = fakeCollect(store, now, {
      beforeCall: async () => {
        signalStarted();
        await gate;
      },
    });
    const first = runWatch({
      store, trigger: "schedule", env: ENABLED, graphFetch: fetchImpl, collect, now, log: captureLog().log,
    });
    await started;
    const second = await runWatch({
      store, trigger: "task_scheduler", env: ENABLED, graphFetch: fetchImpl, collect, now, log: captureLog().log,
    });
    assert.equal(second.status, "skipped_locked");
    releaseFirst();
    const firstRes = await first;
    assert.equal(firstRes.status, "ok");
    assert.deepEqual(
      store.runs.map((r) => [r.trigger, r.status]),
      [["schedule", "ok"], ["task_scheduler", "skipped_locked"]],
    );
    assert.equal(store.releases, 1);
  });
});

describe("runWatch ok path", () => {
  it("collects the newest own media when no env target, counts calls, diffs real snapshots", async () => {
    const store = fakeStore({
      snapshots: previousSnapshots(),
      previousList: {
        media: [
          { id: "m2", timestamp: "2026-10-08T10:00:00+0000", shortcode: "OLD2" },
          { id: "m1", timestamp: "2026-10-08T09:00:00+0000", shortcode: "GONE1" },
        ],
        collectedAt: PREV_AT.toISOString(),
      },
    });
    const now = clock();
    const expiresAtSec = Math.floor(T0.getTime() / 1000) + 3 * 86_400;
    const { fetchImpl, calls } = fakeFetch({
      expiresAtSec,
      usageHeaders: { "x-app-usage": JSON.stringify({ call_count: 12, total_time: 3, total_cputime: 1 }) },
    });
    const { collect, inputs } = fakeCollect(store, now);
    const { lines, log } = captureLog();

    const res = await runWatch({
      store,
      trigger: "schedule",
      env: { ...ENABLED, INSTAGRAM_APP_TOKEN: APP_SECRET },
      graphFetch: fetchImpl,
      debugTokenBaseUrl: "https://graph.facebook.test/v21.0",
      collect,
      now,
      log,
    });

    assert.equal(res.status, "ok");
    assert.equal(inputs.length, 1);
    assert.equal(inputs[0].graphMediaId, "m3");
    assert.deepEqual(inputs[0].sources, ["graph"]);
    assert.equal(calls.length, 2, "debug_token + media list");
    assert.equal(res.graphCalls, 3, "debug_token + media list + collect");
    assert.equal(res.maxUsagePct, 12);

    const row = store.runs[0];
    assert.equal(row.status, "ok");
    assert.equal(row.graphCalls, 3);
    assert.equal(row.maxUsagePct, 12);
    assert.equal(row.errorCode, null);
    assert.equal(row.tokenExpiresAt.getTime(), expiresAtSec * 1000);
    assert.ok(row.tokenCheckedAt instanceof Date);
    assert.equal(store.sinceArgs[0].toISOString(), "2026-10-09T00:00:00.000Z");

    const diff = row.diffJson;
    assert.deepEqual(diff.newPosts.map((m) => m.id), ["m3"]);
    assert.deepEqual(diff.removedPosts.map((m) => m.id), ["m1"]);
    assert.equal(diff.previousMediaListCollectedAt, PREV_AT.toISOString());
    assert.equal(diff.posts.length, 1);
    const post = diff.posts[0];
    assert.equal(post.status, "changed");
    assert.equal(post.shortcode, "NEW3");
    assert.equal(post.previousCollectedAt, PREV_AT.toISOString());
    assert.ok(Date.parse(post.latestCollectedAt) > T0.getTime());
    assert.deepEqual(post.delta, { likes: 5, comments: 0 });
    assert.equal(post.latest.reach, undefined, "no invented reach");

    assert.ok(lines.some((l) => /expires in 3\.0 days/.test(l)), "expiry warning logged");
    assert.equal(store.releases, 1);
  });

  it("env shortcodes override the newest-media target", async () => {
    const input = buildWatchCollectInput({ ZEREF_COLLECT_SHORTCODES: "ABC,DEF" }, "m3");
    assert.deepEqual(input.shortcodes, ["ABC", "DEF"]);
    assert.equal(input.graphMediaId, undefined);
    const byId = buildWatchCollectInput({ ZEREF_COLLECT_GRAPH_MEDIA_ID: "env-id" }, "m3");
    assert.equal(byId.graphMediaId, "env-id");
    assert.equal(buildWatchCollectInput({}, "m3").graphMediaId, "m3");
  });

  it("deduped collect reports unchanged without a delta", async () => {
    const store = fakeStore({ snapshots: previousSnapshots() });
    const now = clock();
    const { fetchImpl } = fakeFetch();
    const res = await runWatch({
      store, trigger: "schedule", env: ENABLED, graphFetch: fetchImpl,
      collect: fakeCollect(store, now, { dedupe: true }).collect, now, log: captureLog().log,
    });
    assert.equal(res.status, "ok");
    const post = res.diff.posts[0];
    assert.equal(post.status, "unchanged");
    assert.deepEqual(post.delta, {});
    assert.equal(post.latestCollectedAt, PREV_AT.toISOString());
  });

  it("skips debug_token when already checked today or no app token", async () => {
    for (const [env, checked] of [
      [{ ...ENABLED, INSTAGRAM_APP_TOKEN: APP_SECRET }, true],
      [ENABLED, false],
    ]) {
      const store = fakeStore({ tokenCheckedToday: checked });
      const now = clock();
      const { fetchImpl, calls } = fakeFetch();
      const res = await runWatch({
        store, trigger: "schedule", env, graphFetch: fetchImpl,
        collect: fakeCollect(store, now).collect, now, log: captureLog().log,
      });
      assert.equal(res.status, "ok");
      assert.ok(!calls.some((u) => u.pathname.endsWith("/debug_token")));
      assert.equal(store.runs[0].tokenCheckedAt, null);
    }
  });

  it("empty media list with no env target ends as error no_media", async () => {
    const store = fakeStore();
    const { fetchImpl } = fakeFetch({ media: [] });
    const res = await runWatch({
      store, trigger: "schedule", env: ENABLED, graphFetch: fetchImpl,
      collect: async () => assert.fail("must not collect"), now: clock(), log: captureLog().log,
    });
    assert.equal(res.status, "error");
    assert.equal(res.errorCode, "no_media");
    assert.equal(store.runs[0].graphCalls, 1);
  });
});

describe("runWatch budget + throttling", () => {
  it("persisted daily usage at cap → throttled before any Graph call", async () => {
    const store = fakeStore({ usedToday: 200 });
    const { fetchImpl, calls } = fakeFetch();
    const res = await runWatch({
      store, trigger: "schedule", env: ENABLED, graphFetch: fetchImpl,
      collect: async () => assert.fail("must not collect"), now: clock(), log: captureLog().log,
    });
    assert.equal(res.status, "throttled");
    assert.equal(res.errorCode, "throttled_daily_cap");
    assert.equal(calls.length, 0);
    assert.equal(store.runs[0].graphCalls, 0);
    assert.equal(store.releases, 1);
  });

  it("budget exhausted mid-run (custom cap) → throttled, counted calls persisted", async () => {
    const store = fakeStore({ usedToday: 9 });
    const now = clock();
    const { fetchImpl } = fakeFetch();
    const res = await runWatch({
      store, trigger: "schedule", env: { ...ENABLED, ZEREF_GRAPH_DAILY_CAP: "10" }, graphFetch: fetchImpl,
      collect: fakeCollect(store, now).collect, now, log: captureLog().log,
    });
    assert.equal(res.status, "throttled");
    assert.equal(res.errorCode, "throttled_daily_cap");
    assert.equal(store.runs[0].graphCalls, 1);
    assert.equal(store.runs[0].diffJson, null);
  });

  it("HTTP 429 → throttled_http_429, no retry", async () => {
    const store = fakeStore();
    const { fetchImpl, calls } = fakeFetch({ mediaStatus: 429 });
    const res = await runWatch({
      store, trigger: "schedule", env: ENABLED, graphFetch: fetchImpl,
      collect: async () => assert.fail("must not collect"), now: clock(), log: captureLog().log,
    });
    assert.equal(res.status, "throttled");
    assert.equal(res.errorCode, "throttled_http_429");
    assert.equal(calls.length, 1);
  });

  it("usage header above threshold → throttled_usage_high with max_usage_pct", async () => {
    const store = fakeStore();
    const { fetchImpl } = fakeFetch({
      usageHeaders: { "x-app-usage": JSON.stringify({ call_count: 91 }) },
    });
    const res = await runWatch({
      store, trigger: "schedule", env: ENABLED, graphFetch: fetchImpl,
      collect: async () => assert.fail("must not collect"), now: clock(), log: captureLog().log,
    });
    assert.equal(res.status, "throttled");
    assert.equal(res.errorCode, "throttled_usage_high");
    assert.equal(store.runs[0].maxUsagePct, 91);
  });
});

describe("runWatch secret hygiene", () => {
  it(`never stores or logs the token (${SECRET})`, async () => {
    const store = fakeStore({ snapshots: previousSnapshots() });
    const now = clock();
    const { fetchImpl } = fakeFetch({ debugFails: true });
    const { lines, log } = captureLog();
    const res = await runWatch({
      store,
      trigger: "schedule",
      env: { ...ENABLED, INSTAGRAM_APP_TOKEN: APP_SECRET },
      graphFetch: fetchImpl,
      collect: fakeCollect(store, now, {
        throwError: new Error(`collect blew up access_token=${SECRET} raw ${SECRET} ${APP_SECRET}`),
      }).collect,
      now,
      log,
    });
    assert.equal(res.status, "error");
    assert.equal(res.errorCode, "internal");
    const persisted = JSON.stringify(store.runs);
    const logged = lines.join("\n");
    for (const secret of [SECRET, APP_SECRET]) {
      assert.ok(!persisted.includes(secret), "token persisted");
      assert.ok(!logged.includes(secret), "token logged");
      assert.ok(!JSON.stringify(res).includes(secret), "token in result");
    }
    assert.ok(lines.some((l) => l.includes("token expiry check failed")));
  });

  it("network errors carrying the token URL map to graph_network and are redacted", async () => {
    const store = fakeStore();
    const { lines, log } = captureLog();
    const res = await runWatch({
      store,
      trigger: "schedule",
      env: ENABLED,
      graphFetch: async (url) => {
        throw new Error(`ECONNREFUSED ${String(url)}`);
      },
      collect: async () => assert.fail("must not collect"),
      now: clock(),
      log,
    });
    assert.equal(res.errorCode, "graph_network");
    assert.ok(!lines.join("\n").includes(SECRET));
    assert.ok(!JSON.stringify(store.runs).includes(SECRET));
  });

  it("watchErrorCode classifies without exposing messages", () => {
    assert.equal(watchErrorCode(new GraphThrottledError("http_429")), "throttled_http_429");
    assert.equal(watchErrorCode(new Error("Graph API 400: bad SECRET_TOKEN_123")), "graph_http_400");
    assert.equal(watchErrorCode(Object.assign(new Error("x"), { name: "ZodError" })), "invalid_collect_input");
    assert.equal(watchErrorCode(new Error(SECRET)), "internal");
    assert.equal(watchErrorCode("weird"), "internal");
  });
});

describe("createWatchJobHandler", () => {
  it("never throws (no pg-boss retry storm) and redacts the token", async () => {
    const prev = { ...process.env };
    process.env.INSTAGRAM_ACCESS_TOKEN = SECRET;
    process.env.ZEREF_WATCH_ENABLED = "1";
    const warned = [];
    const origWarn = console.warn;
    const origLog = console.log;
    console.warn = (m) => warned.push(String(m));
    console.log = () => {};
    try {
      const pool = {
        query: async () => {
          throw new Error(`db down access_token=${SECRET}`);
        },
        connect: async () => {
          throw new Error(`db down ${SECRET}`);
        },
      };
      const res = await createWatchJobHandler({ pool })({ data: { trigger: "schedule" } });
      assert.equal(res.status, "error");
      assert.equal(res.errorCode, "internal");
      assert.ok(warned.length > 0);
      assert.ok(!warned.join("\n").includes(SECRET));
    } finally {
      console.warn = origWarn;
      console.log = origLog;
      for (const k of ["INSTAGRAM_ACCESS_TOKEN", "ZEREF_WATCH_ENABLED"]) {
        if (prev[k] === undefined) delete process.env[k];
        else process.env[k] = prev[k];
      }
    }
  });

  it("uses a 12-post recent-media window", () => {
    assert.equal(WATCH_MEDIA_WINDOW, 12);
  });
});
