import assert from "node:assert/strict";
import { test } from "node:test";
import { pathToFileURL } from "node:url";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const contracts = await import(
  pathToFileURL(join(repoRoot, "dist/index.js")).href
);

test("PHASE5_CONTRACT_VERSION export", () => {
  assert.equal(contracts.PHASE5_CONTRACT_VERSION, "5.0.0");
});

test("CockpitSlicesSchema validates fixture shape", () => {
  const parsed = contracts.CockpitSlicesSchema.parse({
    schemaVersion: "phase5-cockpit-v1",
    panels: {
      studio: { items: [], insufficientData: false },
      calendar: { items: [], insufficientData: false },
      reports: {
        items: [
          {
            artifactId: "550e8400-e29b-41d4-a716-446655440000",
            kind: "elite",
            headline: "Weekly engagement summary",
            createdAt: "2026-05-29T12:00:00.000Z",
          },
        ],
        insufficientData: false,
      },
      research: { items: [], insufficientData: true },
    },
  });
  assert.equal(parsed.schemaVersion, "phase5-cockpit-v1");
  assert.equal(parsed.panels.research.insufficientData, true);
});
