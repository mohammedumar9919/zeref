import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

const testDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(testDir, "../../..");
const metricsFixturesDir = join(repoRoot, "fixtures/phase-3/metrics");
const retrievalFixturesDir = join(repoRoot, "fixtures/phase-3/retrieval");

const built = await import(pathToFileURL(join(testDir, "../dist/index.js")).href);
const contracts = await import(
  pathToFileURL(join(testDir, "../../contracts/dist/index.js")).href
);

const {
  METRIC_VERSION,
  computeEngagement,
  computeMetricFacts,
  detectNichePillars,
  fieldsFromMerged,
  retrievalAtK,
  topKNeighborIds,
} = built;

const { MergedInstagramPostPayloadSchema } = contracts;

function loadJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function loadMetricFixture(name) {
  return loadJson(join(metricsFixturesDir, name));
}

test("exports METRIC_VERSION", () => {
  assert.equal(METRIC_VERSION, "phase3-v1");
});

test("golden metrics fixtures match computeMetricFacts", () => {
  const files = readdirSync(metricsFixturesDir).filter((name) => name.endsWith(".json"));
  assert.ok(files.length >= 5, "expected at least five metric golden fixtures");

  for (const file of files) {
    const fixture = loadMetricFixture(file);
    const parsed = MergedInstagramPostPayloadSchema.parse(fixture.input);
    const result = computeMetricFacts({ merged: parsed });

    assert.equal(result.metricVersion, fixture.expected.metricVersion, file);
    assert.equal(result.insufficientData, fixture.expected.insufficientData, file);
    assert.equal(result.engagementScore, fixture.expected.engagementScore, file);
    assert.deepEqual(result.nicheTags, fixture.expected.nicheTags, file);
  }
});

test("computeEngagement marks sparse posts as insufficient_data", () => {
  const fields = fieldsFromMerged(
    MergedInstagramPostPayloadSchema.parse(loadMetricFixture("insufficient-thin.json").input),
  );
  const result = computeEngagement(fields);
  assert.equal(result.insufficientData, true);
  assert.equal(result.engagementScore, null);
  assert.equal(result.reason, "missing_engagement_counts");
});

test("detectNichePillars is deterministic for pillar keywords", () => {
  const rich = fieldsFromMerged(
    MergedInstagramPostPayloadSchema.parse(loadMetricFixture("rich-night-ride.json").input),
  );
  assert.deepEqual(detectNichePillars(rich), ["night_ride"]);
});

test("retrieval@3 ≥ 1.0 on phase-3 retrieval goldens (C15)", () => {
  const corpus = loadJson(join(retrievalFixturesDir, "corpus.json"));
  const queryFiles = readdirSync(join(retrievalFixturesDir, "queries")).filter((name) =>
    name.endsWith(".json"),
  );

  let minRecall = 1;
  for (const file of queryFiles) {
    const queryFixture = loadJson(join(retrievalFixturesDir, "queries", file));
    const ranked = topKNeighborIds(queryFixture.embedding, corpus.items, 3);
    assert.deepEqual(
      ranked,
      queryFixture.expectedTop3,
      `top-3 mismatch for ${queryFixture.id}`,
    );

    const recall = retrievalAtK(queryFixture.expectedTop3, ranked, 3);
    minRecall = Math.min(minRecall, recall);
  }

  assert.ok(minRecall >= 1.0, `retrieval@3 recall ${minRecall} below 1.0`);
});
