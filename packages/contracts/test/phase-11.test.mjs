import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

const testDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(testDir, "../../..");
const fixturesRoot = join(repoRoot, "fixtures/phase-11");

const built = await import(pathToFileURL(join(testDir, "../dist/index.js")).href);

const {
  PHASE11_CONTRACT_VERSION,
  AgentRunSchema,
  AgentStepSchema,
  ConfirmRequestSchema,
  JarvisAuditEntrySchema,
  JarvisToolNameSchema,
} = built;

const EXPECTED_TOOLS = [
  "get_cockpit_summary",
  "get_latest_report_headline",
  "get_pipeline_status",
  "get_report_artifact",
  "get_worker_health",
  "memory_save",
  "memory_search",
  "enqueue_job",
  "create_calendar_event",
  "update_studio_draft",
  "create_research_topic",
];

function loadFixture(name) {
  return JSON.parse(readFileSync(join(fixturesRoot, name), "utf8"));
}

function roundTrip(schema, name) {
  const raw = loadFixture(name);
  const parsed = schema.parse(raw);
  const serialized = JSON.parse(JSON.stringify(parsed));
  const reparsed = schema.safeParse(serialized);
  assert.equal(
    reparsed.success,
    true,
    `round-trip failed for ${name}: ${reparsed.success ? "" : reparsed.error.message}`,
  );
  return parsed;
}

test("exports PHASE11_CONTRACT_VERSION", () => {
  assert.equal(PHASE11_CONTRACT_VERSION, "11.0.0");
});

test("AgentRunSchema fixture round-trip", () => {
  const parsed = roundTrip(AgentRunSchema, "agent-run.valid.json");
  assert.equal(parsed.status, "completed");
  assert.equal(parsed.iterationCount, 2);
});

test("AgentStepSchema fixture round-trip", () => {
  const parsed = roundTrip(AgentStepSchema, "agent-step.valid.json");
  assert.equal(parsed.type, "tool_call");
  assert.equal(parsed.toolName, "get_latest_report_headline");
});

test("JarvisAuditEntrySchema fixture round-trip", () => {
  const parsed = roundTrip(JarvisAuditEntrySchema, "jarvis-audit-entry.valid.json");
  assert.equal(parsed.riskTier, "read");
  assert.equal(parsed.simulated, true);
});

test("ConfirmRequestSchema validates write-high confirm payload", () => {
  const parsed = ConfirmRequestSchema.parse({
    runId: "660e8400-e29b-41d4-a716-446655440001",
    stepIndex: 2,
    toolName: "create_calendar_event",
    args: { title: "Weekly review", scheduledAt: "2026-06-20T09:00:00.000Z" },
    message: "Shall I schedule the weekly review for Friday at nine?",
    riskTier: "write-high",
  });
  assert.equal(parsed.toolName, "create_calendar_event");
});

test("JarvisToolNameSchema includes full Phase 11 tool set (C149)", () => {
  assert.deepEqual(JarvisToolNameSchema.options, EXPECTED_TOOLS);
  for (const name of EXPECTED_TOOLS) {
    assert.equal(JarvisToolNameSchema.safeParse(name).success, true, `missing tool: ${name}`);
  }
});

test("AgentStepSchema validates all step types", () => {
  const runId = "660e8400-e29b-41d4-a716-446655440001";
  const base = { runId, stepIndex: 0, ts: "2026-06-15T10:00:00.000Z" };

  AgentStepSchema.parse({ type: "predict", ...base, text: "Checking reports." });
  AgentStepSchema.parse({
    type: "tool_call",
    ...base,
    stepIndex: 1,
    toolName: "get_pipeline_status",
    args: {},
  });
  AgentStepSchema.parse({
    type: "tool_result",
    ...base,
    stepIndex: 2,
    toolName: "get_pipeline_status",
    result: { available: true, status: "idle" },
    durationMs: 3,
  });
  AgentStepSchema.parse({
    type: "confirm_prompt",
    ...base,
    stepIndex: 3,
    message: "Shall I enqueue the collect job?",
    toolName: "enqueue_job",
    args: { jobType: "collect" },
    riskTier: "write-high",
  });
  AgentStepSchema.parse({
    type: "completed",
    ...base,
    stepIndex: 4,
    resultText: "Pipeline is idle.",
  });
  AgentStepSchema.parse({
    type: "budget_exhausted",
    ...base,
    stepIndex: 5,
    reason: "max iterations reached",
  });
  AgentStepSchema.parse({
    type: "killed",
    ...base,
    stepIndex: 6,
    reason: "operator abort",
  });
});
