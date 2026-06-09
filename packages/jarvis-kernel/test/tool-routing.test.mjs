import assert from "node:assert/strict";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

const pkgRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const built = await import(pathToFileURL(join(pkgRoot, "dist/index.js")).href);

const { selectToolsForTranscript } = built;

describe("jarvis-kernel tool routing (Phase 7)", () => {
  it("routes memory_search for recall-like prompts", () => {
    const selected = selectToolsForTranscript(
      "Can you recall what I said last week about the report?",
    );
    assert.ok(selected.some((t) => t.name === "memory_search"));
  });

  it("routes memory_save for explicit remember/save prompts", () => {
    const selected = selectToolsForTranscript(
      "Remember this: the launch window is Tuesday at 9am.",
    );
    assert.ok(selected.some((t) => t.name === "memory_save"));
  });

  it("keeps cockpit summary as default fallback", () => {
    const selected = selectToolsForTranscript("Hello.");
    assert.deepEqual(selected, [{ name: "get_cockpit_summary", args: {} }]);
  });
});

