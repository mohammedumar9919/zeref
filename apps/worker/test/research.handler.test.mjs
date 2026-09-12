import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

const testDir = dirname(fileURLToPath(import.meta.url));
const workerRoot = join(testDir, "..");
const repoRoot = join(workerRoot, "../..");
const fixturesRoot = join(repoRoot, "fixtures/phase-9");

const contracts = await import(
  pathToFileURL(join(repoRoot, "packages/contracts/dist/index.js")).href
);
const analytics = await import(
  pathToFileURL(join(repoRoot, "packages/analytics/dist/index.js")).href
);

const {
  ResearchJobInputSchema,
  ResearchJobOutputSchema,
  ResearchSignalSchema,
} = contracts;
const { buildResearchSignalCandidates, aggregateTrendScore } = analytics;

function loadFixture(name) {
  return JSON.parse(readFileSync(join(fixturesRoot, name), "utf8"));
}

describe("@zeref/worker research handler fixtures", () => {
  it("ResearchJobInputSchema accepts fixture enqueue body", () => {
    const input = ResearchJobInputSchema.parse(loadFixture("research-job-input.valid.json"));
    assert.equal(input.jobType, "research");
    assert.equal(input.topicId, "770e8400-e29b-41d4-a716-446655440001");
  });

  it("ResearchJobOutputSchema accepts fixture result", () => {
    const output = ResearchJobOutputSchema.parse(loadFixture("research-job-output.valid.json"));
    assert.equal(output.signalsWritten, 2);
    assert.equal(output.trendScore, 0.65);
  });

  it("fixture signals align with analytics candidate builder", () => {
    const signals = loadFixture("research-signals.valid.json");
    const candidates = buildResearchSignalCandidates({
      metricFacts: [
        {
          id: signals[0].payloadJson.metricFactId,
          normalizedEntityId: signals[0].sourceEntityId,
          snapshotId: signals[0].sourceSnapshotId,
          engagementScore: signals[0].payloadJson.engagementScore,
          insufficientData: false,
        },
      ],
      embeddings: [
        {
          id: "aa0e8400-e29b-41d4-a716-446655440001",
          normalizedEntityId: signals[1].sourceEntityId,
          model: signals[1].payloadJson.model,
        },
      ],
      scopeEntityId: signals[0].sourceEntityId,
    });

    assert.equal(candidates.length, 2);
    assert.equal(aggregateTrendScore(candidates), 0.65);

    for (const sig of signals) {
      assert.equal(ResearchSignalSchema.safeParse(sig).success, true);
    }
  });

  it("builds A3 intel candidates from own-account 5x outliers", async () => {
    process.env.ZEREF_LLM_MOCK = "1";
    delete process.env.OPENROUTER_API_KEY;
    const factsRoot = join(repoRoot, "fixtures/cloud-a3");
    const facts = JSON.parse(
      readFileSync(join(factsRoot, "metric-facts-outliers.valid.json"), "utf8"),
    );
    const { scanOwnAccountOutliers, buildResearchIntelCandidates, scoreCaptionHook, buildWeeklyBrief } =
      analytics;

    const { outliers } = scanOwnAccountOutliers(facts);
    assert.equal(outliers.length, 1);
    assert.ok(outliers[0].multiplier >= 5);

    const hooks = [await scoreCaptionHook(facts[3].factsJson.caption)];
    const brief = await buildWeeklyBrief({
      outliers,
      hooks,
      topicTitle: "Ride log engagement trends",
    });
    const intel = buildResearchIntelCandidates({ outliers, hooks, brief });
    assert.ok(intel.some((c) => c.signalType === "engagement_outlier"));
    assert.ok(intel.some((c) => c.signalType === "caption_hook"));
    assert.ok(intel.some((c) => c.signalType === "weekly_brief"));
    assert.match(brief.text, /HIT999/);
  });
});
