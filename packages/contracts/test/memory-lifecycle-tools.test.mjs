import assert from "node:assert/strict";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

const testDir = dirname(fileURLToPath(import.meta.url));
const built = await import(pathToFileURL(join(testDir, "../dist/index.js")).href);

const { JarvisToolNameSchema, JarvisToolCallSchema, FactCardSchema } = built;

const LIFECYCLE_TOOLS = [
  "memory_history",
  "memory_propose_archive",
  "memory_supersede",
  "memory_archive",
];

test("JarvisToolNameSchema includes the C19b memory lifecycle tools", () => {
  for (const name of LIFECYCLE_TOOLS) {
    assert.equal(JarvisToolNameSchema.safeParse(name).success, true, `missing ${name}`);
  }
});

test("JarvisToolNameSchema still rejects unknown and delete-style names", () => {
  for (const name of ["memory_delete", "memory_forget_all", "memory_purge", ""]) {
    assert.equal(JarvisToolNameSchema.safeParse(name).success, false, name);
  }
});

test("tool calls and fact cards accept the lifecycle tool names", () => {
  JarvisToolCallSchema.parse({
    name: "memory_supersede",
    args: { target: "7pm posting", content: "9pm posting" },
    result: { available: true },
  });
  const card = FactCardSchema.parse({
    id: "run:0",
    runId: "22222222-2222-4222-8222-222222222222",
    toolName: "memory_history",
    title: "Memory history",
    fields: [{ label: "Current", value: "post reels at 9pm" }],
    badge: "SIMULATED",
    ts: "2026-10-13T00:00:00.000Z",
  });
  assert.equal(card.toolName, "memory_history");
});
