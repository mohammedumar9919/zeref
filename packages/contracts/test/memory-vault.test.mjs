import assert from "node:assert/strict";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

const testDir = dirname(fileURLToPath(import.meta.url));
const built = await import(pathToFileURL(join(testDir, "../dist/index.js")).href);

const {
  MemorySourceSchema,
  MemoryEntrySchema,
  VaultKindSchema,
  VaultItemSchema,
  VaultForgetResultSchema,
  JarvisToolNameSchema,
} = built;

const NOW = "2026-09-28T19:00:00.000Z";
const ID = "5f0c7a52-3a6b-4c1e-9d2f-0b6a1c2d3e4f";

test("MemorySourceSchema accepts 'vault'", () => {
  assert.equal(MemorySourceSchema.safeParse("vault").success, true);
});

test("MemoryEntrySchema accepts a vault-sourced entry with metadata.kind", () => {
  const parsed = MemoryEntrySchema.parse({
    id: ID,
    tier: "semantic",
    content: "post reels at 7pm",
    source: "vault",
    entityId: null,
    valueKey: null,
    value: null,
    temporalScore: 1,
    observation: "verified",
    metadata: { kind: "pin" },
    createdAt: NOW,
    updatedAt: NOW,
  });
  assert.equal(parsed.source, "vault");
});

test("VaultKindSchema is exactly confirmed_turn | rejection | correction | pin", () => {
  assert.deepEqual(VaultKindSchema.options, [
    "confirmed_turn",
    "rejection",
    "correction",
    "pin",
  ]);
  assert.equal(VaultKindSchema.safeParse("note").success, false);
});

test("VaultItemSchema parses minimal and full items", () => {
  const minimal = VaultItemSchema.parse({
    id: ID,
    kind: "pin",
    content: "post reels at 7pm",
    createdAt: NOW,
  });
  assert.equal(minimal.kind, "pin");

  const full = VaultItemSchema.parse({
    id: ID,
    kind: "correction",
    content: "brand colour is teal, not green",
    entityId: null,
    sourceTurnId: "turn-42",
    createdAt: NOW,
  });
  assert.equal(full.sourceTurnId, "turn-42");
});

test("VaultItemSchema rejects empty content, bad kind, and unknown keys", () => {
  const base = { id: ID, kind: "pin", content: "x", createdAt: NOW };
  assert.equal(VaultItemSchema.safeParse({ ...base, content: "" }).success, false);
  assert.equal(VaultItemSchema.safeParse({ ...base, kind: "memo" }).success, false);
  assert.equal(VaultItemSchema.safeParse({ ...base, extra: 1 }).success, false);
  assert.equal(VaultItemSchema.safeParse({ ...base, entityId: "not-a-uuid" }).success, false);
});

test("VaultForgetResultSchema is { deleted: boolean }", () => {
  assert.equal(VaultForgetResultSchema.safeParse({ deleted: true }).success, true);
  assert.equal(VaultForgetResultSchema.safeParse({}).success, false);
});

test("JarvisToolNameSchema includes the vault tools", () => {
  for (const name of ["vault_list", "vault_pin", "vault_forget"]) {
    assert.equal(JarvisToolNameSchema.safeParse(name).success, true, `missing ${name}`);
  }
});
