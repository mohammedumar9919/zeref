import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

const testDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(testDir, "../../..");
const metricsFixture = join(repoRoot, "fixtures/phase-3/metrics");

const built = await import(pathToFileURL(join(testDir, "../dist/index.js")).href);
const { buildResearchSignalCandidates, aggregateTrendScore } = built;

test("buildResearchSignalCandidates produces engagement + embedding signals", () => {
  const metricFacts = [
    {
      id: "990e8400-e29b-41d4-a716-446655440001",
      normalizedEntityId: "550e8400-e29b-41d4-a716-446655440001",
      snapshotId: "550e8400-e29b-41d4-a716-446655440002",
      engagementScore: 0.68,
      insufficientData: false,
    },
  ];
  const embeddings = [
    {
      id: "aa0e8400-e29b-41d4-a716-446655440001",
      normalizedEntityId: "550e8400-e29b-41d4-a716-446655440001",
      model: "text-embedding-3-small",
    },
  ];

  const candidates = buildResearchSignalCandidates({
    metricFacts,
    embeddings,
    scopeEntityId: "550e8400-e29b-41d4-a716-446655440001",
  });

  assert.equal(candidates.length, 2);
  assert.equal(candidates[0].signalType, "engagement_delta");
  assert.equal(candidates[1].signalType, "embedding_cluster");
  assert.equal(aggregateTrendScore(candidates), 0.65);
});

test("buildResearchSignalCandidates skips insufficient metric facts", () => {
  const candidates = buildResearchSignalCandidates({
    metricFacts: [
      {
        id: "990e8400-e29b-41d4-a716-446655440099",
        normalizedEntityId: "550e8400-e29b-41d4-a716-446655440001",
        snapshotId: "550e8400-e29b-41d4-a716-446655440002",
        engagementScore: null,
        insufficientData: true,
      },
    ],
    embeddings: [],
  });
  assert.equal(candidates.length, 0);
  assert.equal(aggregateTrendScore(candidates), null);
});

test("buildResearchSignalCandidates uses phase-3 ride-log metrics fixture", () => {
  const raw = JSON.parse(readFileSync(join(metricsFixture, "ride-log.json"), "utf8"));
  const candidates = buildResearchSignalCandidates({
    metricFacts: [
      {
        id: "990e8400-e29b-41d4-a716-446655440001",
        normalizedEntityId: "550e8400-e29b-41d4-a716-446655440001",
        snapshotId: "550e8400-e29b-41d4-a716-446655440002",
        engagementScore: raw.expected.engagementScore,
        insufficientData: raw.expected.insufficientData ?? false,
      },
    ],
    embeddings: [],
  });
  assert.equal(candidates.length, 1);
  assert.equal(candidates[0].signalType, "engagement_delta");
});
