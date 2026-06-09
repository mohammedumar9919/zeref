import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, join } from "node:path";

const pkgRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const built = await import(pathToFileURL(join(pkgRoot, "dist/index.js")).href);

const { ruleBasedContradictionCheck } = built;

describe("ruleBasedContradictionCheck", () => {
  const entityId = "b2000000-0000-4000-8000-000000000002";

  const existing = [
    {
      id: "old-entry-id",
      entityId,
      valueKey: "format",
      value: "elite",
      observation: "verified",
    },
  ];

  it("detects conflicting value for same entity and key", () => {
    const matches = ruleBasedContradictionCheck(
      { id: "new-entry-id", entityId, valueKey: "format", value: "compact" },
      existing,
    );
    assert.equal(matches.length, 1);
    assert.equal(matches[0].supersededId, "old-entry-id");
  });

  it("ignores when values match", () => {
    const matches = ruleBasedContradictionCheck(
      { id: "new-entry-id", entityId, valueKey: "format", value: "elite" },
      existing,
    );
    assert.equal(matches.length, 0);
  });

  it("ignores when entityId missing", () => {
    const matches = ruleBasedContradictionCheck(
      { id: "new-entry-id", entityId: null, valueKey: "format", value: "compact" },
      existing,
    );
    assert.equal(matches.length, 0);
  });
});
