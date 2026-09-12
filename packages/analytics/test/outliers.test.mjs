import assert from "node:assert/strict";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

const testDir = dirname(fileURLToPath(import.meta.url));
const built = await import(pathToFileURL(join(testDir, "../dist/index.js")).href);
const { findEngagementOutliers, median, DEFAULT_OUTLIER_MULTIPLIER } = built;

test("median returns the middle value for an odd-length list", () => {
  assert.equal(median([1, 9, 3]), 3);
});

test("findEngagementOutliers flags own-account posts at 5x median", () => {
  assert.equal(DEFAULT_OUTLIER_MULTIPLIER, 5);
  const result = findEngagementOutliers([
    {
      id: "990e8400-e29b-41d4-a716-446655440001",
      normalizedEntityId: "550e8400-e29b-41d4-a716-446655440001",
      snapshotId: "550e8400-e29b-41d4-a716-446655440002",
      value: 100,
      shortcode: "BASE01",
    },
    {
      id: "990e8400-e29b-41d4-a716-446655440002",
      normalizedEntityId: "550e8400-e29b-41d4-a716-446655440001",
      snapshotId: "550e8400-e29b-41d4-a716-446655440003",
      value: 120,
      shortcode: "BASE02",
    },
    {
      id: "990e8400-e29b-41d4-a716-446655440003",
      normalizedEntityId: "550e8400-e29b-41d4-a716-446655440001",
      snapshotId: "550e8400-e29b-41d4-a716-446655440004",
      value: 80,
      shortcode: "BASE03",
    },
    {
      id: "990e8400-e29b-41d4-a716-446655440004",
      normalizedEntityId: "550e8400-e29b-41d4-a716-446655440001",
      snapshotId: "550e8400-e29b-41d4-a716-446655440005",
      value: 600,
      shortcode: "HIT999",
      caption: "Night ride — 5am start, no edits.",
    },
  ]);

  assert.equal(result.median, 110);
  assert.equal(result.outliers.length, 1);
  assert.equal(result.outliers[0].shortcode, "HIT999");
  assert.ok(result.outliers[0].multiplier >= 5);
});

test("findEngagementOutliers ignores insufficient or non-finite values", () => {
  const result = findEngagementOutliers([
    {
      id: "990e8400-e29b-41d4-a716-446655440010",
      normalizedEntityId: "550e8400-e29b-41d4-a716-446655440001",
      value: Number.NaN,
    },
  ]);
  assert.equal(result.median, null);
  assert.equal(result.outliers.length, 0);
});
