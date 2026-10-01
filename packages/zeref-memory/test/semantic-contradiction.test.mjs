import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, join } from "node:path";

const pkgRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const built = await import(pathToFileURL(join(pkgRoot, "dist/index.js")).href);
const { normalizeValueKey } = await import(
  pathToFileURL(join(pkgRoot, "dist/semantic-contradiction.js")).href
);

const { semanticContradictionCheck, checkContradictions, MockMemoryAdapter } = built;

const entityId = "b2000000-0000-4000-8000-000000000002";
const otherEntity = "b2000000-0000-4000-8000-000000000003";

function entry(overrides) {
  return {
    id: "old-entry-id",
    entityId,
    valueKey: null,
    value: null,
    content: "",
    observation: "verified",
    ...overrides,
  };
}

describe("normalizeValueKey", () => {
  it("strips separators and maps aliases", () => {
    assert.equal(normalizeValueKey("best_time_to_post"), "postingtime");
    assert.equal(normalizeValueKey("Posting Time"), "postingtime");
    assert.equal(normalizeValueKey("niche"), normalizeValueKey("topic"));
  });
});

describe("semanticContradictionCheck", () => {
  it("alias: best_time_to_post vs posting_time with different values", () => {
    const existing = [entry({ valueKey: "posting_time", value: "9pm" })];
    const out = semanticContradictionCheck(
      { id: "new", entityId, valueKey: "best_time_to_post", value: "7pm", content: "" },
      existing,
    );
    assert.equal(out.length, 1);
    assert.equal(out[0].reason, "alias");
    assert.equal(out[0].suspectedOfId, "old-entry-id");
    assert.ok(out[0].confidence > 0 && out[0].confidence <= 1);
  });

  it("negation: likes reels vs does not like reels", () => {
    const existing = [entry({ content: "user likes reels" })];
    const out = semanticContradictionCheck(
      { id: "new", entityId, valueKey: null, value: null, content: "user does not like reels" },
      existing,
    );
    assert.equal(out.length, 1);
    assert.equal(out[0].reason, "negation");
  });

  it("negation: 'no longer' counts as one negation", () => {
    const existing = [entry({ content: "user posts daily" })];
    const out = semanticContradictionCheck(
      { id: "new", entityId, valueKey: null, value: null, content: "user no longer posts daily" },
      existing,
    );
    assert.equal(out[0]?.reason, "negation");
  });

  it("numeric: 4% vs 6% is suspected; 4% vs 4 % is not", () => {
    const existing = [entry({ valueKey: "target_er", value: "4%" })];
    const changed = semanticContradictionCheck(
      { id: "new", entityId, valueKey: "target_er", value: "6%", content: "" },
      existing,
    );
    assert.equal(changed.length, 1);
    assert.equal(changed[0].reason, "numeric");
    const same = semanticContradictionCheck(
      { id: "new", entityId, valueKey: "target_er", value: "4 %", content: "" },
      existing,
    );
    assert.equal(same.length, 0);
  });

  it("different entity yields nothing", () => {
    const existing = [entry({ valueKey: "posting_time", value: "9pm", content: "user likes reels" })];
    const out = semanticContradictionCheck(
      {
        id: "new",
        entityId: otherEntity,
        valueKey: "best_time_to_post",
        value: "7pm",
        content: "user does not like reels",
      },
      existing,
    );
    assert.equal(out.length, 0);
  });
});

describe("checkContradictions", () => {
  it("exact rule still reports and suspects are deduped against it", () => {
    const existing = [entry({ valueKey: "format", value: "elite" })];
    const { exact, suspected } = checkContradictions(
      { id: "new", entityId, valueKey: "format", value: "compact", content: "" },
      existing,
    );
    assert.equal(exact.length, 1);
    assert.equal(exact[0].supersededId, "old-entry-id");
    assert.equal(suspected.length, 0);
  });
});

describe("save path (mock adapter)", () => {
  it("stores suspected ids on the new entry and leaves the old entry verified", async () => {
    const adapter = new MockMemoryAdapter(false);
    const { entry: old } = await adapter.saveMemory({
      content: "best posting time",
      source: "voice",
      entityId,
      valueKey: "posting_time",
      value: "9pm",
    });
    const { entry: fresh, contradictions } = await adapter.saveMemory({
      content: "best posting time",
      source: "voice",
      entityId,
      valueKey: "best_time_to_post",
      value: "7pm",
    });
    assert.equal(contradictions.length, 0);
    assert.deepEqual(fresh.metadata.suspectedContradictionOf, [{ id: old.id, reason: "alias" }]);
    const stored = adapter.store.entries.find((e) => e.id === old.id);
    assert.equal(stored.observation, "verified");
  });
});
