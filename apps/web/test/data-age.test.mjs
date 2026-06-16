import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const testDir = dirname(fileURLToPath(import.meta.url));
const webRoot = join(testDir, "..");

const dataAge = await import(pathToFileURL(join(webRoot, "lib/data-age.ts")).href);

const { DEFAULT_STALE_MS, computeDataAge, aggregatePanelDataAgeState } = dataAge;

describe("data-age", () => {
  it("computeDataAge returns fixture when fixture mode", () => {
    const now = Date.now();
    const result = computeDataAge(new Date(now - 999).toISOString(), now, true);
    assert.deepEqual(result, { dataAgeState: "fixture" });
  });

  it("computeDataAge returns stale when collectedAt missing", () => {
    const result = computeDataAge(undefined, Date.now(), false);
    assert.equal(result.dataAgeState, "stale");
    assert.equal(result.collectedAt, undefined);
    assert.equal(result.dataAgeMs, undefined);
  });

  it("computeDataAge returns live when within default staleness window", () => {
    const now = 1_700_000_000_000;
    const collectedAt = new Date(now - (DEFAULT_STALE_MS - 1)).toISOString();
    const result = computeDataAge(collectedAt, now, false);
    assert.equal(result.dataAgeState, "live");
    assert.equal(result.collectedAt, collectedAt);
    assert.ok(typeof result.dataAgeMs === "number");
    assert.ok(result.dataAgeMs < DEFAULT_STALE_MS);
  });

  it("computeDataAge returns stale when older than default staleness window", () => {
    const now = 1_700_000_000_000;
    const collectedAt = new Date(now - (DEFAULT_STALE_MS + 1)).toISOString();
    const result = computeDataAge(collectedAt, now, false);
    assert.equal(result.dataAgeState, "stale");
    assert.equal(result.collectedAt, collectedAt);
    assert.ok(typeof result.dataAgeMs === "number");
    assert.ok(result.dataAgeMs > DEFAULT_STALE_MS);
  });

  it("aggregatePanelDataAgeState returns stale for empty items", () => {
    assert.equal(aggregatePanelDataAgeState([]), "stale");
    assert.equal(aggregatePanelDataAgeState(undefined), "stale");
  });

  it("aggregatePanelDataAgeState returns fixture when all fixture", () => {
    assert.equal(
      aggregatePanelDataAgeState([{ dataAgeState: "fixture" }, { dataAgeState: "fixture" }]),
      "fixture",
    );
  });

  it("aggregatePanelDataAgeState returns stale when any stale", () => {
    assert.equal(
      aggregatePanelDataAgeState([{ dataAgeState: "live" }, { dataAgeState: "stale" }]),
      "stale",
    );
  });

  it("aggregatePanelDataAgeState returns live when all live", () => {
    assert.equal(
      aggregatePanelDataAgeState([{ dataAgeState: "live" }, { dataAgeState: "live" }]),
      "live",
    );
  });
});

