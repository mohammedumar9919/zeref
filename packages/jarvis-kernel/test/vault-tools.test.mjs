import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const pkgRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const kernel = await import(pathToFileURL(join(pkgRoot, "dist/index.js")).href);
const { MockMemoryAdapter } = await import("@zeref/zeref-memory");

const { ZEREF_TOOL_DESCRIPTORS, createZerefToolExecutor, runAgentLoop } = kernel;

function tierOf(name) {
  return ZEREF_TOOL_DESCRIPTORS.find((t) => t.name === name)?.riskTier;
}

function stubContext(overrides = {}) {
  const read = {
    canRead: () => true,
    unavailableMessage: (tool) => `${tool} unavailable`,
    memorySave: async (content) => ({ available: true, entryId: "e1", content }),
    ...overrides,
  };
  return { read, write: {} };
}

function vaultPortFrom(adapter) {
  return {
    saveVaultItem: (input) => adapter.saveVaultItem(input),
    listVaultItems: (opts) => adapter.listVaultItems(opts),
    forgetVaultItem: (id) => adapter.forgetVaultItem(id),
  };
}

function scriptedLlm(calls) {
  let i = 0;
  return {
    async predict() {
      const call = calls[i];
      i += 1;
      if (call) return { toolCall: call, tokensUsed: 1 };
      return { text: "Done.", tokensUsed: 1 };
    },
  };
}

describe("@zeref/jarvis-kernel vault tools (CLOUD-C3)", () => {
  it("descriptor tiers: vault_list read, vault_pin write-low, vault_forget write-high", () => {
    assert.equal(tierOf("vault_list"), "read");
    assert.equal(tierOf("vault_pin"), "write-low");
    assert.equal(tierOf("vault_forget"), "write-high");
  });

  it("memory_save is write-low (it writes)", () => {
    assert.equal(tierOf("memory_save"), "write-low");
  });

  it("memory_save still executes through the executor", async () => {
    const executor = createZerefToolExecutor(stubContext());
    const result = await executor.execute("memory_save", { content: "meeting notes" });
    assert.equal(result.ok, true);
    assert.equal(result.data.entryId, "e1");
  });

  it("vault_pin saves a pin and vault_list returns it", async () => {
    const adapter = new MockMemoryAdapter(false);
    const executor = createZerefToolExecutor(stubContext(), { vault: vaultPortFrom(adapter) });

    const pinned = await executor.execute("vault_pin", { content: "post reels at 7pm" });
    assert.equal(pinned.ok, true);
    assert.equal(pinned.data.item.kind, "pin");
    assert.equal(pinned.data.item.content, "post reels at 7pm");

    const listed = await executor.execute("vault_list", {});
    assert.equal(listed.ok, true);
    assert.ok(listed.data.items.some((i) => i.content === "post reels at 7pm"));
  });

  it("vault_pin rejects empty content", async () => {
    const adapter = new MockMemoryAdapter(false);
    const executor = createZerefToolExecutor(stubContext(), { vault: vaultPortFrom(adapter) });
    const result = await executor.execute("vault_pin", { content: "   " });
    assert.equal(result.ok, false);
  });

  it("vault_forget awaits confirm without confirmed, executes with it", async () => {
    const adapter = new MockMemoryAdapter(false);
    const item = await adapter.saveVaultItem({ kind: "pin", content: "post reels at 7pm" });
    const executor = createZerefToolExecutor(stubContext(), { vault: vaultPortFrom(adapter) });
    const forgetCall = { name: "vault_forget", args: { id: item.id }, id: "tc-forget" };

    const blocked = await runAgentLoop({
      runId: "run-forget-1",
      transcript: "forget that",
      llm: scriptedLlm([forgetCall]),
      toolExecutor: executor,
      tools: ZEREF_TOOL_DESCRIPTORS,
    });
    assert.equal(blocked.terminalReason, "awaiting_confirm");
    assert.equal(blocked.pendingConfirm.toolName, "vault_forget");
    assert.equal((await adapter.listVaultItems()).length, 1);

    const confirmed = await runAgentLoop({
      runId: "run-forget-1",
      transcript: "forget that",
      llm: scriptedLlm([forgetCall]),
      toolExecutor: executor,
      tools: ZEREF_TOOL_DESCRIPTORS,
      confirmGrant: {
        runId: "run-forget-1",
        toolName: blocked.pendingConfirm.toolName,
        argsHash: blocked.pendingConfirm.argsHash,
      },
    });
    assert.equal(confirmed.terminalReason, "completed");
    const exec = confirmed.steps.find((s) => s.type === "tool_execute");
    assert.equal(exec.ok, true);
    assert.equal(exec.result.deleted, true);
    assert.equal((await adapter.listVaultItems()).length, 0);
  });

  it("vault_forget without id forgets the most recent item; content match is exact-scoped", async () => {
    const adapter = new MockMemoryAdapter(false);
    const older = await adapter.saveVaultItem({
      kind: "pin",
      content: "older pin",
      createdAt: new Date(Date.now() - 60_000),
    });
    const newer = await adapter.saveVaultItem({ kind: "pin", content: "newer pin" });
    const executor = createZerefToolExecutor(stubContext(), { vault: vaultPortFrom(adapter) });

    const miss = await executor.execute("vault_forget", { content: "nothing like this" });
    assert.equal(miss.ok, true);
    assert.equal(miss.data.deleted, false);
    assert.equal((await adapter.listVaultItems()).length, 2);

    const latest = await executor.execute("vault_forget", {});
    assert.equal(latest.data.deleted, true);
    assert.equal(latest.data.id, newer.id);

    const byContent = await executor.execute("vault_forget", { content: "OLDER" });
    assert.equal(byContent.data.deleted, true);
    assert.equal(byContent.data.id, older.id);
  });

  it("vault_forget never deletes non-vault memory", async () => {
    const adapter = new MockMemoryAdapter(false);
    const { entry } = await adapter.saveMemory({ content: "voice note", source: "voice" });
    const executor = createZerefToolExecutor(stubContext(), { vault: vaultPortFrom(adapter) });
    const result = await executor.execute("vault_forget", { id: entry.id });
    assert.equal(result.data.deleted, false);
    const search = await adapter.searchMemory("voice note");
    assert.ok(search.results.some((r) => r.entry.id === entry.id));
  });

  it("vault_pin keeps one copy of the same content (case-insensitive)", async () => {
    const adapter = new MockMemoryAdapter(false);
    const executor = createZerefToolExecutor(stubContext(), { vault: vaultPortFrom(adapter) });
    const first = await executor.execute("vault_pin", { content: "post reels at 7pm" });
    const second = await executor.execute("vault_pin", { content: "Post Reels at 7pm" });
    assert.equal(second.data.alreadyPinned, true);
    assert.equal(second.data.item.id, first.data.item.id);
    assert.equal((await adapter.listVaultItems({ kind: "pin" })).length, 1);
  });

  it("resolveVaultForgetTarget prefers the latest pin and names it in the result", async () => {
    const adapter = new MockMemoryAdapter(false);
    const vault = vaultPortFrom(adapter);
    await adapter.saveVaultItem({ kind: "pin", content: "post reels at 7pm" });
    await adapter.saveVaultItem({ kind: "correction", content: "my niche is fitness" });
    const target = await kernel.resolveVaultForgetTarget(vault, {});
    assert.equal(target.content, "post reels at 7pm");
    const executor = createZerefToolExecutor(stubContext(), { vault });
    const result = await executor.execute("vault_forget", {});
    assert.equal(result.data.deleted, true);
    assert.equal(result.data.content, "post reels at 7pm");
  });
});
