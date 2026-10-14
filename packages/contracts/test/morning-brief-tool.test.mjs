import assert from "node:assert/strict";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

const testDir = dirname(fileURLToPath(import.meta.url));
const built = await import(pathToFileURL(join(testDir, "../dist/index.js")).href);

const { JarvisToolNameSchema, JarvisToolCallSchema, FactCardSchema } = built;

test("JarvisToolNameSchema includes get_morning_brief (C12), appended last", () => {
  assert.equal(JarvisToolNameSchema.safeParse("get_morning_brief").success, true);
  assert.equal(JarvisToolNameSchema.options.at(-1), "get_morning_brief");
});

test("JarvisToolNameSchema still rejects near-miss names", () => {
  for (const name of ["morning_brief", "get_morning_briefing", "get_daily_brief", ""]) {
    assert.equal(JarvisToolNameSchema.safeParse(name).success, false, name);
  }
});

test("tool calls and fact cards accept get_morning_brief", () => {
  JarvisToolCallSchema.parse({
    name: "get_morning_brief",
    args: { since: "2026-10-12T07:30:00.000Z" },
    result: { available: true, hasRun: false },
  });
  const card = FactCardSchema.parse({
    id: "run:0",
    runId: "22222222-2222-4222-8222-222222222222",
    toolName: "get_morning_brief",
    title: "Morning brief",
    fields: [{ label: "Data collected", value: "2026-10-13 06:00 UTC" }],
    badge: "FIXTURE",
    ts: "2026-10-13T07:30:00.000Z",
  });
  assert.equal(card.toolName, "get_morning_brief");
});
