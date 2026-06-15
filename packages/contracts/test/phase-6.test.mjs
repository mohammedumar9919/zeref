import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

const testDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(testDir, "../../..");
const fixturesRoot = join(repoRoot, "fixtures/phase-6");

const built = await import(pathToFileURL(join(testDir, "../dist/index.js")).href);

const {
  PHASE6_CONTRACT_VERSION,
  JarvisTurnInputSchema,
  JarvisTurnOutputSchema,
  JarvisTurnAckOutputSchema,
  JarvisTurnResultOutputSchema,
  VoiceStateEventSchema,
  VoiceTranscriptEventSchema,
  VoiceAudioEventSchema,
  PipelineEventSchema,
  JarvisToolNameSchema,
} = built;

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

function assertRejected(schema, name) {
  assert.equal(
    schema.safeParse(loadFixture(name)).success,
    false,
    `expected ${name} rejected`,
  );
}

test("exports PHASE6_CONTRACT_VERSION", () => {
  assert.equal(PHASE6_CONTRACT_VERSION, "6.0.0");
});

test("JarvisTurnInputSchema fixture round-trip (valid)", () => {
  const parsed = roundTrip(JarvisTurnInputSchema, "jarvis-turn-input.valid.json");
  assert.match(parsed.transcript, /report/i);
});

test("JarvisTurnInputSchema rejects invalid fixture", () => {
  assertRejected(JarvisTurnInputSchema, "jarvis-turn-input.invalid.json");
});

test("JarvisTurnOutputSchema fixture round-trip (valid)", () => {
  const parsed = roundTrip(JarvisTurnOutputSchema, "jarvis-turn-output.valid.json");
  assert.equal(parsed.toolCalls.length, 1);
  assert.equal(parsed.toolCalls[0].name, "get_latest_report_headline");
});

test("Voice SSE event schemas round-trip fixtures", () => {
  roundTrip(VoiceAudioEventSchema, "voice-audio-event.valid.json");
  roundTrip(VoiceTranscriptEventSchema, "voice-transcript-event.valid.json");
  roundTrip(VoiceStateEventSchema, "voice-state-event.valid.json");
});

test("PipelineEventSchema validates representative payload", () => {
  PipelineEventSchema.parse({
    type: "pipeline",
    stage: "voice.turn",
    message: "Synthesizing ack audio",
    ts: "2026-05-30T12:00:00.150Z",
    simulated: true,
  });
});

test("JarvisToolNameSchema includes Phase 6 read tools (C149 superset)", () => {
  for (const name of [
    "get_cockpit_summary",
    "get_latest_report_headline",
    "get_pipeline_status",
  ]) {
    assert.ok(
      JarvisToolNameSchema.options.includes(name),
      `missing Phase 6 tool: ${name}`,
    );
  }
});

test("ack and result output schemas validate partial turn payloads", () => {
  const full = loadFixture("jarvis-turn-output.valid.json");
  JarvisTurnAckOutputSchema.parse({
    ackText: full.ackText,
    globeState: "thinking",
    events: [full.events[0]],
  });
  JarvisTurnResultOutputSchema.parse({
    resultText: full.resultText,
    toolCalls: full.toolCalls,
    globeState: full.globeState,
    events: full.events,
  });
});
