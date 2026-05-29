import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, join } from "node:path";

const pkgRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const built = await import(pathToFileURL(join(pkgRoot, "dist/index.js")).href);

const { lintNarrativeCitations, buildCitationIndex } = built;

describe("@zeref/reports citations", () => {
  it("lint accepts markers present in index", () => {
    const factId = "00000000-0000-4000-8000-000000000050";
    const index = buildCitationIndex([
      { id: factId, engagementScore: "50.7", insufficientData: false },
    ]);
    const md = `Score **50.7** [mf:${factId}]`;
    const result = lintNarrativeCitations(md, index);
    assert.equal(result.ok, true);
  });

  it("lint rejects orphan markers", () => {
    const result = lintNarrativeCitations("Value 12 [mf:00000000-0000-4000-8000-000000000099]", []);
    assert.equal(result.ok, false);
  });
});
