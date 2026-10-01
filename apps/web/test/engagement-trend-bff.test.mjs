import assert from "node:assert/strict";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

const webRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

process.env.ZEREF_BFF_FIXTURE = "1";
const bff = await import(
  pathToFileURL(join(webRoot, "lib/reports/engagement-trend-bff.ts")).href
);

const id = (n) => `990e8400-e29b-41d4-a716-44665544000${n}`;
const point = (n, at, score, timeBasis = "published") => ({
  entityId: id(n),
  title: `Post ${n}`,
  at,
  timeBasis,
  engagementScore: score,
});

describe("engagement trend BFF (CLOUD-C6)", () => {
  it("fixture mode returns the labelled fixture with its real median", async () => {
    const result = await bff.getEngagementTrend();
    assert.equal(result.status, 200);
    assert.equal(result.body.source, "fixture");
    assert.ok(result.body.points.length >= 6);
    assert.equal(result.body.insufficientData, false);
    assert.ok(Math.abs(result.body.median - 49.32) < 1e-9);
  });

  it("sorts points by time and derives the median from scored points only", () => {
    const trend = bff.buildEngagementTrend(
      [
        point(3, "2026-09-03T00:00:00.000Z", 30),
        point(1, "2026-09-01T00:00:00.000Z", 10),
        point(2, "2026-09-02T00:00:00.000Z", null),
        point(4, "2026-09-04T00:00:00.000Z", 20),
      ],
      "live",
    );
    assert.deepEqual(
      trend.points.map((p) => p.entityId),
      [id(1), id(2), id(3), id(4)],
    );
    assert.equal(trend.median, 20);
    assert.equal(trend.insufficientData, false);
  });

  it("flags insufficient data with fewer than 3 scored posts", () => {
    const trend = bff.buildEngagementTrend(
      [point(1, "2026-09-01T00:00:00.000Z", 10), point(2, "2026-09-02T00:00:00.000Z", 12)],
      "live",
    );
    assert.equal(trend.insufficientData, true);
  });

  it("live mode without a database reports an error instead of empty data", async (t) => {
    if (process.env.DATABASE_URL) {
      t.skip("DATABASE_URL set — live path covered by CI Postgres");
      return;
    }
    process.env.ZEREF_BFF_FIXTURE = "0";
    try {
      const result = await bff.getEngagementTrend();
      assert.equal(result.status, 500);
      assert.match(result.body.error, /database not configured/);
    } finally {
      process.env.ZEREF_BFF_FIXTURE = "1";
    }
  });
});
