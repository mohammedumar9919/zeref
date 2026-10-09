import assert from "node:assert/strict";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

const testDir = dirname(fileURLToPath(import.meta.url));
const built = await import(pathToFileURL(join(testDir, "../dist/index.js")).href);

const {
  FACT_CARD_EVENT,
  FACT_CARD_MAX_FIELDS,
  FactCardBadgeSchema,
  FactCardSchema,
} = built;

const RUN_ID = "11111111-1111-4111-8111-111111111111";

function validCard(overrides = {}) {
  return {
    id: `${RUN_ID}:1`,
    runId: RUN_ID,
    toolName: "get_report_artifact",
    title: "Last post engagement",
    fields: [
      { label: "Engagement score", value: "50.7" },
      { label: "Compared with usual", value: "In line with your usual" },
    ],
    badge: "FIXTURE",
    ts: "2026-10-08T12:00:00.000Z",
    ...overrides,
  };
}

test("C17a: FactCardSchema accepts a whitelisted card", () => {
  assert.ok(FactCardSchema.safeParse(validCard()).success);
  assert.ok(FactCardSchema.safeParse(validCard({ fields: [] })).success);
  assert.ok(
    FactCardSchema.safeParse(
      validCard({ fields: [{ label: "Score", value: "50.7", unit: "pts" }] }),
    ).success,
  );
});

test("C17a: badge is FIXTURE | SIMULATED | LIVE only", () => {
  assert.deepEqual(FactCardBadgeSchema.options, ["FIXTURE", "SIMULATED", "LIVE"]);
  assert.equal(FactCardSchema.safeParse(validCard({ badge: "MOCK" })).success, false);
});

test("C17a: unknown tool names and extra keys are rejected", () => {
  assert.equal(FactCardSchema.safeParse(validCard({ toolName: "rm_rf" })).success, false);
  assert.equal(FactCardSchema.safeParse(validCard({ result: { raw: 1 } })).success, false);
  assert.equal(
    FactCardSchema.safeParse(
      validCard({ fields: [{ label: "Score", value: "1", raw: {} }] }),
    ).success,
    false,
  );
});

test("C17a: length caps keep cards small", () => {
  assert.equal(FactCardSchema.safeParse(validCard({ title: "x".repeat(121) })).success, false);
  assert.equal(
    FactCardSchema.safeParse(validCard({ fields: [{ label: "L", value: "v".repeat(161) }] }))
      .success,
    false,
  );
  const tooMany = Array.from({ length: FACT_CARD_MAX_FIELDS + 1 }, (_, i) => ({
    label: `L${i}`,
    value: "v",
  }));
  assert.equal(FactCardSchema.safeParse(validCard({ fields: tooMany })).success, false);
  assert.equal(
    FactCardSchema.safeParse(validCard({ fields: [{ label: "Score", value: "" }] })).success,
    false,
  );
});

test("C17a: runId must be a uuid and ts an ISO datetime", () => {
  assert.equal(FactCardSchema.safeParse(validCard({ runId: "run-1" })).success, false);
  assert.equal(FactCardSchema.safeParse(validCard({ ts: "yesterday" })).success, false);
});

test("C17a: event name is jarvis.fact_card", () => {
  assert.equal(FACT_CARD_EVENT, "jarvis.fact_card");
});
