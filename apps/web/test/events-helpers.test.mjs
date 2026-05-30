import assert from "node:assert/strict";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

const testDir = dirname(fileURLToPath(import.meta.url));
const webRoot = join(testDir, "..");
const repoRoot = join(webRoot, "../..");

const events = await import(pathToFileURL(join(webRoot, "lib/events/index.ts")).href);
const contracts = await import(
  pathToFileURL(join(repoRoot, "packages/contracts/dist/index.js")).href,
);

describe("events helpers", () => {
  it("buildSimulatedTelemetryEvent returns schema-valid stub", () => {
    const event = events.buildSimulatedTelemetryEvent();
    const parsed = contracts.TelemetryEventSchema.parse(event);
    assert.equal(parsed.simulated, true);
    assert.match(parsed.message, /stub/i);
    assert.match(parsed.ts, /^\d{4}-\d{2}-\d{2}T/);
  });

  it("formatSseEvent encodes event type and JSON data", () => {
    const payload = events.buildSimulatedTelemetryEvent();
    const frame = events.formatSseEvent("telemetry", payload);
    assert.match(frame, /^event: telemetry\n/);
    assert.match(frame, /^data: /m);
    assert.match(frame, /simulated/);
    assert.match(frame, /\n\n$/);
  });

  it("formatSseEvent encodes heartbeat without data line", () => {
    const frame = events.formatSseEvent("heartbeat");
    assert.equal(frame, "event: heartbeat\n\n");
  });

  it("parseTelemetryEvent validates JSON payload", () => {
    const raw = events.buildSimulatedTelemetryEvent();
    const parsed = events.parseTelemetryEvent(raw);
    assert.equal(parsed.simulated, true);
  });
});
