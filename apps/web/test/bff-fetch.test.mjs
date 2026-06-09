import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const webRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

describe("getCockpitSlices (RSC direct load)", () => {
  /** @type {typeof import('../lib/bff.ts')} */
  let bff;

  before(async () => {
    delete process.env.ZEREF_PHASE9_RESEARCH;
    bff = await import(pathToFileURL(join(webRoot, "lib/bff.ts")).href);
  });

  after(() => {
    delete process.env.ZEREF_BFF_FIXTURE;
    delete process.env.ZEREF_PHASE9_RESEARCH;
    delete process.env.DATABASE_URL;
  });

  it("throws CockpitBffError when DB unavailable and not in fixture mode", async () => {
    delete process.env.ZEREF_BFF_FIXTURE;
    delete process.env.DATABASE_URL;

    await assert.rejects(
      () => bff.getCockpitSlices(),
      (err) => {
        assert.equal(err.name, "CockpitBffError");
        assert.match(err.message, /DATABASE_URL/);
        return true;
      },
    );
  });

  it("returns validated slices from loadCockpitSlices in fixture mode", async () => {
    process.env.ZEREF_BFF_FIXTURE = "1";

    const slices = await bff.getCockpitSlices();
    assert.equal(slices.schemaVersion, "phase8-cockpit-v1");
    assert.ok(slices.panels.studio);
    assert.ok(Array.isArray(slices.panels.reports.items));
  });
});
