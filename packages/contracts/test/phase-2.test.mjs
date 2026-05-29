import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

const testDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(testDir, "../../..");
const fixturesRoot = join(repoRoot, "fixtures/phase-2");
const graphFixtures = join(fixturesRoot, "graph");

const built = await import(pathToFileURL(join(testDir, "../dist/index.js")).href);

const {
  PHASE2_CONTRACT_VERSION,
  CollectJobInputSchema,
  CollectJobOutputSchema,
  GraphIgUserSchema,
  GraphMediaFieldsSchema,
  GraphMediaListResponseSchema,
  MergedInstagramPostPayloadSchema,
  NormalizeJobInputSchema,
} = built;

function loadFixture(subdir, name) {
  const base = subdir ? join(fixturesRoot, subdir) : fixturesRoot;
  return JSON.parse(readFileSync(join(base, name), "utf8"));
}

function roundTrip(schema, subdir, name) {
  const raw = loadFixture(subdir, name);
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

function assertRejected(schema, subdir, name) {
  const raw = loadFixture(subdir, name);
  const result = schema.safeParse(raw);
  assert.equal(result.success, false, `expected ${name} to be rejected`);
}

test("exports PHASE2_CONTRACT_VERSION", () => {
  assert.equal(PHASE2_CONTRACT_VERSION, "2.0.0");
});

test("GraphIgUser fixture round-trip (valid)", () => {
  roundTrip(GraphIgUserSchema, "graph", "user.valid.json");
});

test("GraphIgUser rejects invalid fixture", () => {
  assertRejected(GraphIgUserSchema, "graph", "user.invalid.json");
});

test("GraphMediaListResponse fixture round-trip (valid)", () => {
  roundTrip(GraphMediaListResponseSchema, "graph", "media-list.valid.json");
});

test("GraphMediaListResponse rejects invalid fixture", () => {
  assertRejected(GraphMediaListResponseSchema, "graph", "media-list.invalid.json");
});

test("GraphMediaFields fixture round-trip (single media)", () => {
  roundTrip(GraphMediaFieldsSchema, "graph", "media-single.valid.json");
});

test("CollectJobInput fixture round-trip (valid)", () => {
  roundTrip(CollectJobInputSchema, null, "collect-job-input.valid.json");
});

test("CollectJobInput rejects invalid fixture (no shortcodes + raw blob)", () => {
  assertRejected(CollectJobInputSchema, null, "collect-job-input.invalid.json");
});

test("CollectJobOutput fixture round-trip (valid)", () => {
  roundTrip(CollectJobOutputSchema, null, "collect-job-output.valid.json");
});

test("MergedInstagramPostPayload fixture round-trip (valid)", () => {
  roundTrip(MergedInstagramPostPayloadSchema, null, "merged-post.valid.json");
});

test("MergedInstagramPostPayload rejects invalid fixture", () => {
  assertRejected(MergedInstagramPostPayloadSchema, null, "merged-post.invalid.json");
});

test("Phase 1 C6 guard unchanged on NormalizeJobInput", () => {
  const raw = JSON.parse(
    readFileSync(
      join(repoRoot, "fixtures/phase-1/normalize-job.invalid-raw-blob.json"),
      "utf8",
    ),
  );
  assert.equal(NormalizeJobInputSchema.safeParse(raw).success, false);
});
