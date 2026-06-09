import assert from "node:assert/strict";
import { describe, it, beforeEach } from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, join } from "node:path";

const pkgRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const built = await import(pathToFileURL(join(pkgRoot, "dist/index.js")).href);

const { temporalScore, getHalfLifeDays } = built;

describe("temporalScore", () => {
  beforeEach(() => {
    delete process.env.ZEREF_MEMORY_HALF_LIFE_DAYS;
  });

  it("returns 1 at creation time", () => {
    const now = new Date("2026-05-31T12:00:00.000Z");
    assert.equal(temporalScore(now, now), 1);
  });

  it("halves score after 30 days by default", () => {
    const created = new Date("2026-05-01T12:00:00.000Z");
    const now = new Date("2026-05-31T12:00:00.000Z");
    const score = temporalScore(created, now);
    assert.ok(Math.abs(score - 0.5) < 0.01, `expected ~0.5, got ${score}`);
  });

  it("respects ZEREF_MEMORY_HALF_LIFE_DAYS override", () => {
    process.env.ZEREF_MEMORY_HALF_LIFE_DAYS = "10";
    assert.equal(getHalfLifeDays(), 10);
    const created = new Date("2026-05-21T12:00:00.000Z");
    const now = new Date("2026-05-31T12:00:00.000Z");
    const score = temporalScore(created, now);
    assert.ok(Math.abs(score - 0.5) < 0.01);
  });
});
