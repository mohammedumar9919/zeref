import assert from "node:assert/strict";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

const workerRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const built = await import(pathToFileURL(join(workerRoot, "dist/lib/cockpit-outbox.js")).href);

const { buildPipelineOutboxPayload } = built;

describe("cockpit-outbox", () => {
  it("buildPipelineOutboxPayload sets simulated false for worker completions", () => {
    const payload = buildPipelineOutboxPayload("report");
    assert.equal(payload.type, "pipeline");
    assert.equal(payload.stage, "report");
    assert.equal(payload.simulated, false);
    assert.match(payload.message, /completed/i);
  });
});
