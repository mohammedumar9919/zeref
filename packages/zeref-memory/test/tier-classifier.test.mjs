import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, join } from "node:path";

const pkgRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const built = await import(pathToFileURL(join(pkgRoot, "dist/index.js")).href);

const { autoTierClassifier } = built;

describe("autoTierClassifier", () => {
  it("classifies voice source as episodic", () => {
    assert.equal(
      autoTierClassifier("User asked about reports", { source: "voice" }),
      "episodic",
    );
  });

  it("classifies worker source as episodic", () => {
    assert.equal(
      autoTierClassifier("Pipeline completed normalize job", { source: "worker" }),
      "episodic",
    );
  });

  it("classifies snapshot references as project", () => {
    assert.equal(
      autoTierClassifier("Snapshot abc123 linked to report headline analysis.", {}),
      "project",
    );
  });

  it("classifies verify commands as procedural", () => {
    assert.equal(
      autoTierClassifier("Run verify:phase-6 before deploying voice changes.", {}),
      "procedural",
    );
  });

  it("defaults to semantic for stable facts", () => {
    assert.equal(
      autoTierClassifier("User prefers elite report format.", { entityId: "b2000000-0000-4000-8000-000000000002" }),
      "semantic",
    );
  });
});
