import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const webRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = join(webRoot, "../..");

const researchBff = await import(pathToFileURL(join(webRoot, "lib/research-bff.ts")).href);
const contracts = await import(
  pathToFileURL(join(repoRoot, "packages/contracts/dist/index.js")).href
);

const FIXTURE_TOPIC_ID = "770e8400-e29b-41d4-a716-446655440001";

describe("CLOUD-A3 research intel (fixture)", () => {
  before(() => {
    process.env.ZEREF_BFF_FIXTURE = "1";
    researchBff.resetResearchFixtureStateForTests();
  });

  after(() => {
    delete process.env.ZEREF_BFF_FIXTURE;
    researchBff.resetResearchFixtureStateForTests();
  });

  it("returns outliers and a readable weekly brief", async () => {
    const result = await researchBff.getResearchIntel();
    assert.equal(result.status, 200);
    const intel = contracts.ResearchIntelSchema.parse(result.body);
    assert.ok(intel.outliers.length >= 1);
    assert.ok(intel.outliers[0].multiplier >= 5);
    assert.ok(intel.weeklyBrief?.text);
    assert.match(intel.weeklyBrief.text, /HIT999/);
    assert.equal(intel.competitor?.source, "fixture");
  });

  it("resolves intel for the fixture topic id", async () => {
    const result = await researchBff.getResearchIntel(FIXTURE_TOPIC_ID);
    assert.equal(result.status, 200);
    assert.equal(result.body.topicId, FIXTURE_TOPIC_ID);
  });

  it("derives intel from A3 signal payloads", () => {
    const intel = researchBff.deriveResearchIntelFromSignals(FIXTURE_TOPIC_ID, [
      {
        id: "880e8400-e29b-41d4-a716-446655440010",
        topicId: FIXTURE_TOPIC_ID,
        signalType: "engagement_outlier",
        score: 5.45,
        payloadJson: {
          metricFactId: "990e8400-e29b-41d4-a716-446655440004",
          value: 600,
          median: 110,
          multiplier: 5.45,
          shortcode: "HIT999",
        },
        computedAt: "2026-09-12T00:00:00.000Z",
      },
      {
        id: "880e8400-e29b-41d4-a716-446655440011",
        topicId: FIXTURE_TOPIC_ID,
        signalType: "weekly_brief",
        score: 1,
        payloadJson: {
          text: "Weekly brief (mocked): HIT999 hit 5.5× own-account median.",
          groundedIn: ["HIT999"],
          mocked: true,
        },
        computedAt: "2026-09-12T00:00:00.000Z",
      },
    ]);
    assert.equal(intel.outliers.length, 1);
    assert.match(intel.weeklyBrief.text, /HIT999/);
  });
});
