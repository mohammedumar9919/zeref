import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { after, before, describe, it } from "node:test";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const testDir = dirname(fileURLToPath(import.meta.url));
const webRoot = join(testDir, "../..");
const repoRoot = join(webRoot, "../..");

const { buildMorningBrief, loadMorningBrief, resolveSince, summarizeWatchDiff } = await import(
  pathToFileURL(join(webRoot, "lib/jarvis/morning-brief.ts")).href
);
const { runJarvisAgent } = await import(
  pathToFileURL(join(webRoot, "lib/jarvis/agent-runtime.ts")).href
);
const { createJarvisLlmPort } = await import(
  pathToFileURL(join(webRoot, "lib/jarvis/llm-port.ts")).href
);
const { buildFactCards } = await import(pathToFileURL(join(webRoot, "lib/jarvis/fact-cards.ts")).href);
const { resetCockpitEventBusForTests } = await import(
  pathToFileURL(join(webRoot, "lib/cockpit/cockpit-event-bus.ts")).href
);
const { resetMemoryAdapterCache } = await import("@zeref/zeref-memory");
const { ZEREF_TOOL_DESCRIPTORS } = await import("@zeref/jarvis-kernel");

const RUN_ID = "33333333-3333-4333-8333-333333333333";
const HOUR = 3_600_000;
const NOW = new Date("2026-10-13T07:30:00.000Z");
const ENV_KEYS = [
  "ZEREF_PHASE11_AGENT",
  "ZEREF_LLM_MOCK",
  "ZEREF_BFF_FIXTURE",
  "ZEREF_MEMORY_MOCK",
  "ZEREF_JOB_ENQUEUE_MOCK",
];

/** Every number in a result, including digit runs inside strings (ISO dates, labels). */
function numbersIn(value, acc = []) {
  if (typeof value === "number" && Number.isFinite(value)) acc.push(Math.abs(value));
  else if (Array.isArray(value)) value.forEach((v) => numbersIn(v, acc));
  else if (value && typeof value === "object") Object.values(value).forEach((v) => numbersIn(v, acc));
  else if (typeof value === "string") {
    for (const m of value.matchAll(/\d+(?:\.\d+)?/g)) acc.push(Number(m[0]));
  }
  return acc;
}

function assertGrounded(text, result, where) {
  const known = numbersIn(result);
  for (const m of text.matchAll(/\d+(?:\.\d+)?/g)) {
    assert.ok(known.includes(Number(m[0])), `${where}: "${m[0]}" in "${text}" is not in the tool result`);
  }
}

function cardTexts(card) {
  return [card.title, ...card.fields.flatMap((f) => [f.label, f.value, f.unit ?? ""])];
}

function row(overrides) {
  return {
    id: randomUUID(),
    trigger: "schedule",
    status: "ok",
    startedAt: NOW.toISOString(),
    finishedAt: null,
    tokenExpiresAt: null,
    tokenCheckedAt: null,
    errorCode: null,
    diffJson: null,
    ...overrides,
  };
}

async function finishText(data) {
  const llm = createJarvisLlmPort();
  const result = await llm.predict({
    messages: [
      { role: "user", content: "good morning" },
      { role: "assistant", content: JSON.stringify({ toolCall: { name: "get_morning_brief", args: {} } }) },
      { role: "tool", content: JSON.stringify({ ok: true, data }) },
    ],
    tools: ZEREF_TOOL_DESCRIPTORS,
  });
  return result.text;
}

async function mockRoute(transcript) {
  const llm = createJarvisLlmPort();
  const result = await llm.predict({
    messages: [{ role: "user", content: transcript }],
    tools: ZEREF_TOOL_DESCRIPTORS,
  });
  return result.toolCall?.name;
}

describe("morning brief builder (CLOUD-C12)", () => {
  it("fixture: latest ok run in the last 24 h, totals as stored, collected-at, token, problem runs", async () => {
    process.env.ZEREF_BFF_FIXTURE = "1";
    try {
      const brief = await loadMorningBrief();
      assert.equal(brief.available, true);
      assert.equal(brief.source, "fixture");
      assert.match(brief.note, /Fixture data/);
      assert.equal(brief.since, "2026-10-12T07:30:00.000Z");
      assert.equal(brief.hasRun, true);
      assert.equal(brief.run.id, "00000000-0000-4000-8000-00000000c121");
      assert.equal(brief.collectedAt, "2026-10-13T06:00:41.000Z");
      assert.equal(brief.collectedAtLabel, "2026-10-13 06:00 UTC");
      assert.equal(brief.previousCollectedAtLabel, "2026-10-12 22:00 UTC");
      assert.equal(brief.newPosts, 1);
      assert.deepEqual(brief.newPostRefs, ["FIXTURE104"]);
      assert.equal(brief.removedPosts, 0);
      assert.equal(brief.postsChecked, 4);
      assert.equal(brief.changedPosts, 2);
      assert.equal(brief.likesChange, 42);
      assert.equal(brief.commentsChange, 3);
      assert.equal(brief.reachChange, 520);
      assert.equal(brief.problemRunCount, 1);
      assert.deepEqual(brief.problemRuns.map((r) => [r.status, r.errorCode]), [["throttled", "graph_usage_high"]]);
      assert.deepEqual(brief.token, {
        expiresAt: "2026-11-24T06:00:00.000Z",
        expiresAtLabel: "2026-11-24 06:00 UTC",
        daysLeft: 41,
        expired: false,
        checkedAt: "2026-10-13T06:00:05.000Z",
      });
      assert.equal(brief.watchEnabled, true);
    } finally {
      delete process.env.ZEREF_BFF_FIXTURE;
    }
  });

  it("no ok run in the window → hasRun false and no diff numbers at all", () => {
    const brief = buildMorningBrief({
      rows: [
        row({
          startedAt: new Date(NOW.getTime() - 72 * HOUR).toISOString(),
          tokenExpiresAt: "2026-10-20T00:00:00.000Z",
          diffJson: { mediaListCollectedAt: "2026-10-10T07:00:00.000Z", newPosts: [{ id: "x" }], posts: [] },
        }),
        row({ status: "skipped_disabled", startedAt: new Date(NOW.getTime() - 2 * HOUR).toISOString() }),
      ],
      now: NOW,
      since: resolveSince(undefined, NOW),
      watchEnabled: false,
      source: "live",
    });
    assert.equal(brief.hasRun, false);
    assert.equal(brief.run, undefined);
    for (const key of ["newPosts", "likesChange", "collectedAt", "changedPosts"]) {
      assert.equal(brief[key], undefined, key);
    }
    assert.equal(brief.lastRun.status, "skipped_disabled");
    assert.equal(brief.token.daysLeft, 6);
  });

  it("no rows at all → empty, honest brief", () => {
    const brief = buildMorningBrief({ rows: [], now: NOW, since: resolveSince(undefined, NOW), watchEnabled: true, source: "live" });
    assert.equal(brief.hasRun, false);
    assert.equal(brief.lastRun, null);
    assert.equal(brief.token, null);
    assert.equal(brief.problemRunCount, 0);
  });

  it("ok run without diff_json is flagged, not filled in", () => {
    const brief = buildMorningBrief({
      rows: [row({ startedAt: new Date(NOW.getTime() - HOUR).toISOString() })],
      now: NOW,
      since: resolveSince(undefined, NOW),
      watchEnabled: true,
      source: "live",
    });
    assert.equal(brief.hasRun, true);
    assert.equal(brief.diffMissing, true);
    assert.equal(brief.newPosts, undefined);
  });

  it("diff summary keeps absent metrics absent and sums only stored deltas", () => {
    const summary = summarizeWatchDiff({
      mediaListCollectedAt: "2026-10-13T06:00:00.000Z",
      newPosts: [],
      removedPosts: [{ id: "gone" }],
      posts: [
        { status: "changed", latestCollectedAt: "2026-10-13T06:00:10.000Z", delta: { likes: -5 } },
        { status: "unchanged", latestCollectedAt: "2026-10-13T06:00:11.000Z", delta: {} },
      ],
    });
    assert.equal(summary.likesChange, -5);
    assert.equal(summary.commentsChange, undefined);
    assert.equal(summary.reachChange, undefined);
    assert.equal(summary.removedPosts, 1);
    assert.equal(summary.changedPosts, 1);
    assert.equal(summarizeWatchDiff(null), undefined);
    assert.equal(summarizeWatchDiff("nope"), undefined);
  });

  it("since: valid past ISO is used, future/garbage → 24 h, older than 7 days is clamped", () => {
    assert.equal(resolveSince("2026-10-12T21:00:00Z", NOW).toISOString(), "2026-10-12T21:00:00.000Z");
    assert.equal(resolveSince("2026-10-14T00:00:00Z", NOW).toISOString(), "2026-10-12T07:30:00.000Z");
    assert.equal(resolveSince("yesterday", NOW).toISOString(), "2026-10-12T07:30:00.000Z");
    assert.equal(resolveSince("2026-09-01T00:00:00Z", NOW).toISOString(), "2026-10-06T07:30:00.000Z");
  });

  it("live without a database says so (no invented brief)", async () => {
    const saved = process.env.DATABASE_URL;
    delete process.env.DATABASE_URL;
    delete process.env.ZEREF_BFF_FIXTURE;
    try {
      const brief = await loadMorningBrief();
      assert.equal(brief.available, false);
      assert.match(brief.message, /database/);
      assert.deepEqual(buildFactCards(RUN_ID, [{ name: "get_morning_brief", args: {}, result: brief }]), []);
    } finally {
      if (saved !== undefined) process.env.DATABASE_URL = saved;
    }
  });

  it("source reads stored rows only: no Graph host, fetch, or writes", () => {
    const src = readFileSync(join(webRoot, "lib/jarvis/morning-brief.ts"), "utf8");
    assert.doesNotMatch(src, /graph\.(facebook|instagram)\.com|fetch\(|\.insert\(|\.update\(|\.delete\(|@zeref\/instagram/);
  });
});

describe("morning brief mock routing + finish text (CLOUD-C12)", () => {
  before(() => {
    process.env.ZEREF_LLM_MOCK = "1";
    delete process.env.OPENROUTER_API_KEY;
  });
  after(() => {
    delete process.env.ZEREF_LLM_MOCK;
  });

  it("golden eval transcripts keep their routing", async () => {
    const tasks = readFileSync(join(repoRoot, "eval/jarvis/golden-tasks.jsonl"), "utf8")
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l && !l.startsWith("#"))
      .map((l) => JSON.parse(l));
    assert.ok(tasks.length >= 10);
    for (const task of tasks) {
      assert.equal(await mockRoute(task.transcript), task.expectedTool, task.id);
    }
  });

  it("routes morning phrasings, and leaves specific asks with their own tool", async () => {
    for (const t of [
      "good morning",
      "Good morning, Jarvis",
      "morning brief please",
      "give me my morning briefing",
      "what changed overnight?",
      "what's changed since yesterday",
      "what has changed since last night",
    ]) {
      assert.equal(await mockRoute(t), "get_morning_brief", t);
    }
    assert.equal(await mockRoute("good morning, what is the latest report headline"), "get_latest_report_headline");
    assert.equal(await mockRoute("good morning, show me the cockpit"), "get_cockpit_summary");
    assert.equal(await mockRoute("read the weekly research brief"), "get_weekly_brief");
  });

  it("no-run finish text says so plainly with only result numbers", async () => {
    const brief = buildMorningBrief({
      rows: [
        row({
          startedAt: new Date(NOW.getTime() - 72 * HOUR).toISOString(),
          tokenExpiresAt: "2026-10-20T00:00:00.000Z",
        }),
        row({ status: "skipped_disabled", startedAt: "2026-10-13T05:30:00.000Z" }),
      ],
      now: NOW,
      since: resolveSince(undefined, NOW),
      watchEnabled: false,
      source: "live",
    });
    const text = await finishText(brief);
    assert.equal(
      text,
      "No watch run since 2026-10-12 07:30 UTC, so there's nothing new to report. " +
        "The last run was skipped disabled at 2026-10-13 05:30 UTC. The watch is off. " +
        "Token: 6 days left. No data collected since 2026-10-12 07:30 UTC.",
    );
    assertGrounded(text, brief, "finish");
    const [card] = buildFactCards(RUN_ID, [{ name: "get_morning_brief", args: {}, result: brief }]);
    assert.deepEqual(
      card.fields.map((f) => [f.label, f.value]),
      [
        ["Watch run", "None since 2026-10-12 07:30 UTC"],
        ["Last run", "skipped disabled at 2026-10-13 05:30 UTC"],
        ["Token days left", "6"],
        ["Watch", "Off"],
      ],
    );
    for (const t of cardTexts(card)) assertGrounded(t, brief, "card");
  });

  it("negative deltas and missing token stay honest", async () => {
    const brief = buildMorningBrief({
      rows: [
        row({
          startedAt: "2026-10-13T06:00:00.000Z",
          diffJson: {
            mediaListCollectedAt: "2026-10-13T06:00:30.000Z",
            newPosts: [],
            removedPosts: [{ id: "a" }],
            posts: [{ status: "changed", latestCollectedAt: "2026-10-13T06:00:40.000Z", delta: { likes: -7 } }],
          },
        }),
      ],
      now: NOW,
      since: resolveSince(undefined, NOW),
      watchEnabled: true,
      source: "live",
    });
    const text = await finishText(brief);
    assert.equal(
      text,
      "0 new posts, 1 removed. Across 1 changed post: likes -7. The watch is on. Token expiry unknown. " +
        "Data collected 2026-10-13 06:00 UTC.",
    );
    assertGrounded(text, brief, "finish");
  });

  it("unavailable result is reported, not filled in", async () => {
    const text = await finishText({ available: false, message: "get_morning_brief unavailable" });
    assert.match(text, /^I can't put the morning brief together right now/);
  });
});

describe("morning brief end-to-end in fixture mode (CLOUD-C12)", () => {
  before(() => {
    for (const key of ENV_KEYS) process.env[key] = "1";
    delete process.env.DATABASE_URL;
    delete process.env.OPENROUTER_API_KEY;
    resetMemoryAdapterCache();
    resetCockpitEventBusForTests();
  });

  after(() => {
    for (const key of ENV_KEYS) delete process.env[key];
    resetMemoryAdapterCache();
    resetCockpitEventBusForTests();
  });

  it("'good morning, Jarvis' → read tool, grounded spoken brief ending with collected-at, FIXTURE card", async () => {
    const result = await runJarvisAgent({ turnId: randomUUID(), transcript: "Good morning, Jarvis" });
    assert.equal(result.terminalReason, "completed");
    assert.equal(result.pendingConfirm, undefined);
    assert.deepEqual(result.toolCalls.map((c) => c.name), ["get_morning_brief"]);
    const data = result.toolCalls[0].result;
    assert.equal(data.source, "fixture");

    assert.equal(
      result.resultText,
      "Fixture data, not your real account. 1 new post, 0 removed. " +
        "Across 2 changed posts: likes +42, comments +3, reach +520. " +
        "1 run since 2026-10-12 07:30 UTC was throttled. The watch is on. Token: 41 days left. " +
        "Data collected 2026-10-13 06:00 UTC.",
    );
    assert.match(result.resultText, /Data collected 2026-10-13 06:00 UTC\.$/);
    assertGrounded(result.resultText, data, "finish");

    assert.equal(result.factCards.length, 1);
    const [card] = result.factCards;
    assert.equal(card.title, "Morning brief");
    assert.equal(card.badge, "FIXTURE");
    assert.ok(card.fields.length <= 6);
    assert.deepEqual(
      card.fields.map((f) => [f.label, f.value]),
      [
        ["New posts", "1"],
        ["Likes change", "+42"],
        ["Data collected", "2026-10-13 06:00 UTC"],
        ["Token days left", "41"],
        ["Watch", "On"],
        ["Throttled or failed runs", "1"],
      ],
    );
    for (const t of cardTexts(card)) assertGrounded(t, data, "card");
  });
});
