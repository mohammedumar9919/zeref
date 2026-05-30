import assert from "node:assert/strict";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

const testDir = dirname(fileURLToPath(import.meta.url));
const built = await import(pathToFileURL(join(testDir, "../dist/index.js")).href);

const { PHASE5_1_CONTRACT_VERSION, TelemetryEventSchema } = built;

test("exports PHASE5_1_CONTRACT_VERSION", () => {
  assert.equal(PHASE5_1_CONTRACT_VERSION, "5.1.0");
});

test("TelemetryEventSchema accepts simulated stub event", () => {
  const parsed = TelemetryEventSchema.parse({
    simulated: true,
    message: "Pipeline idle — stub telemetry (Phase 5.1)",
    ts: "2026-05-30T12:00:00.000Z",
  });
  assert.equal(parsed.simulated, true);
  assert.match(parsed.message, /stub telemetry/i);
});

test("TelemetryEventSchema rejects missing simulated flag", () => {
  assert.equal(
    TelemetryEventSchema.safeParse({
      message: "no simulated flag",
      ts: "2026-05-30T12:00:00.000Z",
    }).success,
    false,
  );
});

test("TelemetryEventSchema rejects empty message", () => {
  assert.equal(
    TelemetryEventSchema.safeParse({
      simulated: true,
      message: "",
      ts: "2026-05-30T12:00:00.000Z",
    }).success,
    false,
  );
});
