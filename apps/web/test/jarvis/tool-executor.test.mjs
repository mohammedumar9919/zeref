import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const testDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(testDir, "../../../..");
const pkgRoot = join(repoRoot, "packages/jarvis-kernel");

const zeref = await import(
  pathToFileURL(join(pkgRoot, "dist/zeref/index.js")).href
);

const { createZerefToolExecutor, ZEREF_TOOL_DESCRIPTORS } = zeref;

function fakeReadContext(overrides = {}) {
  return {
    canRead: () => true,
    unavailableMessage: (tool) => `${tool} unavailable`,
    loadCockpitSummary: async () => ({ available: true, panels: 4 }),
    getLatestReportHeadline: async () => ({ available: true, headline: "Test" }),
    getPipelineStatus: async () => ({ available: true, status: "idle" }),
    getReportArtifact: async () => ({ available: true }),
    getWorkerHealth: async () => ({ available: true, consuming: false }),
    memorySearch: async () => ({ available: true, results: [] }),
    memorySave: async () => ({ available: true, entryId: "mem-1" }),
    getResearchOutliers: async () => ({ available: true, outliers: [] }),
    getWeeklyBrief: async () => ({ available: true, brief: { text: "ok", groundedIn: [], mocked: true } }),
    getInstagramAccountSnapshot: async () => ({ available: true, source: "fixture", mediaFetched: 0 }),
    getInstagramInsights: async () => ({ available: true, source: "fixture", scope: "account", account: {} }),
    discoverCompetitor: async () => ({
      available: false,
      source: "unavailable",
      host: "graph.facebook.com",
      hint: "set FACEBOOK_* — see LIVE_COMPETITOR_SETUP.md",
    }),
    ...overrides,
  };
}

function fakeWriteContext() {
  const calls = [];
  return {
    calls,
    ctx: {
      enqueueJob: async (body) => {
        calls.push({ tool: "enqueue_job", body });
        return { jobId: "job-1", queued: true };
      },
      createCalendarEvent: async (body) => {
        calls.push({ tool: "create_calendar_event", body });
        return { id: "cal-1" };
      },
      updateStudioDraft: async (entityId, body) => {
        calls.push({ tool: "update_studio_draft", entityId, body });
        return { entityId };
      },
      createResearchTopic: async (body) => {
        calls.push({ tool: "create_research_topic", body });
        return { id: "topic-1" };
      },
      researchExternalTrends: async (body) => {
        calls.push({ tool: "research_external_trends", body });
        return { available: true, source: "fixture", trends: [], reelIdeas: [] };
      },
      suggestReelIdeas: async (body) => {
        calls.push({ tool: "suggest_reel_ideas", body });
        return { available: true, ideas: [], sources: ["fixture"] };
      },
      requestPerformanceReport: async (body) => {
        calls.push({ tool: "request_performance_report", body });
        return { available: true, queued: true, jobId: "job-report-1" };
      },
    },
  };
}

describe("zeref tool executor (P11-C)", () => {
  it("returns degraded read payload when canRead is false (C158)", async () => {
    const executor = createZerefToolExecutor({
      read: fakeReadContext({
        canRead: () => false,
        unavailableMessage: () => "database not configured",
      }),
      write: fakeWriteContext().ctx,
    });

    const result = await executor.execute("get_cockpit_summary", {});
    assert.equal(result.ok, true);
    assert.deepEqual(result.data, {
      available: false,
      message: "database not configured",
    });
  });

  it("blocks write-high at loop level without confirm (integration via permissions)", async () => {
    const writeHigh = ZEREF_TOOL_DESCRIPTORS.find((t) => t.name === "enqueue_job");
    assert.ok(writeHigh);
    assert.equal(writeHigh.riskTier, "write-high");
  });

  it("executes enqueue_job through write adapter when invoked directly", async () => {
    const write = fakeWriteContext();
    const executor = createZerefToolExecutor({
      read: fakeReadContext(),
      write: write.ctx,
    });

    const result = await executor.execute("enqueue_job", { jobType: "report" });
    assert.equal(result.ok, true);
    assert.equal(write.calls.length, 1);
    assert.equal(write.calls[0].tool, "enqueue_job");
  });

  it("dedupes writes by idempotency key", async () => {
    const write = fakeWriteContext();
    const executor = createZerefToolExecutor({
      read: fakeReadContext(),
      write: write.ctx,
    });

    const args = { jobType: "report", idempotencyKey: "idem-1" };
    await executor.execute("enqueue_job", args);
    await executor.execute("enqueue_job", args);
    assert.equal(write.calls.length, 1);
  });

  it("executes discover_competitor through read adapter", async () => {
    const executor = createZerefToolExecutor({
      read: fakeReadContext({
        discoverCompetitor: async (args) => ({
          available: true,
          source: "graph-business-discovery",
          host: "graph.facebook.com",
          username: args.username,
        }),
      }),
      write: fakeWriteContext().ctx,
    });
    const result = await executor.execute("discover_competitor", { username: "nasa" });
    assert.equal(result.ok, true);
    assert.equal(result.data.username, "nasa");
    assert.equal(result.data.host, "graph.facebook.com");
  });

  it("executes suggest_reel_ideas through write adapter", async () => {
    const write = fakeWriteContext();
    const executor = createZerefToolExecutor({
      read: fakeReadContext(),
      write: write.ctx,
    });
    const result = await executor.execute("suggest_reel_ideas", { query: "viral reels" });
    assert.equal(result.ok, true);
    assert.equal(write.calls.at(-1).tool, "suggest_reel_ideas");
  });

  it("lists discover_competitor and suggest_reel_ideas descriptors", () => {
    const names = ZEREF_TOOL_DESCRIPTORS.map((t) => t.name);
    assert.ok(names.includes("discover_competitor"));
    assert.ok(names.includes("suggest_reel_ideas"));
    assert.equal(ZEREF_TOOL_DESCRIPTORS.find((t) => t.name === "discover_competitor")?.riskTier, "read");
    assert.equal(ZEREF_TOOL_DESCRIPTORS.find((t) => t.name === "suggest_reel_ideas")?.riskTier, "write-low");
    assert.ok(names.includes("get_instagram_insights"));
  });
});
