import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const pkgRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const kernel = await import(pathToFileURL(join(pkgRoot, "dist/index.js")).href);

const { ZEREF_TOOL_DESCRIPTORS, createZerefToolExecutor, runAgentLoop } = kernel;

function context({ canRead = true, writes } = {}) {
  const calls = [];
  const write = new Proxy(
    {},
    {
      get: (_t, prop) => async () => {
        writes?.push(String(prop));
        return {};
      },
    },
  );
  return {
    calls,
    ctx: {
      read: {
        canRead: () => canRead,
        unavailableMessage: (tool) => `${tool} unavailable`,
        getMorningBrief: async (args) => {
          calls.push(args);
          return { available: true, hasRun: false, sinceLabel: "2026-10-12 07:30 UTC" };
        },
      },
      write,
    },
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

describe("@zeref/jarvis-kernel get_morning_brief (CLOUD-C12)", () => {
  it("is a read-tier descriptor", () => {
    const descriptor = ZEREF_TOOL_DESCRIPTORS.find((t) => t.name === "get_morning_brief");
    assert.ok(descriptor);
    assert.equal(descriptor.riskTier, "read");
    assert.equal(descriptor.idempotent, true);
    assert.match(descriptor.description, /no Graph calls/);
  });

  it("delegates to getMorningBrief, passing only a string since", async () => {
    const { ctx, calls } = context();
    const executor = createZerefToolExecutor(ctx);
    const plain = await executor.execute("get_morning_brief", {});
    assert.equal(plain.ok, true);
    assert.equal(plain.data.available, true);
    await executor.execute("get_morning_brief", { since: " 2026-10-12T07:30:00.000Z " });
    await executor.execute("get_morning_brief", { since: 123, extra: "x" });
    assert.deepEqual(calls, [{}, { since: "2026-10-12T07:30:00.000Z" }, {}]);
  });

  it("returns the degraded payload when reads are unavailable", async () => {
    const { ctx, calls } = context({ canRead: false });
    const result = await createZerefToolExecutor(ctx).execute("get_morning_brief", {});
    assert.deepEqual(result.data, { available: false, message: "get_morning_brief unavailable" });
    assert.equal(calls.length, 0);
  });

  it("runs without a confirm and touches no write callback", async () => {
    const writes = [];
    const { ctx, calls } = context({ writes });
    const loop = await runAgentLoop({
      runId: "run-morning",
      transcript: "good morning",
      llm: scriptedLlm([{ name: "get_morning_brief", args: {}, id: "tc-mb" }]),
      toolExecutor: createZerefToolExecutor(ctx),
      tools: ZEREF_TOOL_DESCRIPTORS,
    });
    assert.equal(loop.terminalReason, "completed");
    const exec = loop.steps.find((s) => s.type === "tool_execute");
    assert.equal(exec.ok, true);
    assert.equal(exec.toolName, "get_morning_brief");
    assert.equal(calls.length, 1);
    assert.deepEqual(writes, []);
  });

  it("unknown tools still fail closed", async () => {
    const { ctx } = context();
    const executor = createZerefToolExecutor(ctx);
    const result = await executor.execute("get_morning_briefing", {});
    assert.equal(result.ok, false);
    assert.match(result.error, /unknown tool/);
  });

  it("read adapter only reads the context (no write or Graph path)", () => {
    const src = readFileSync(join(pkgRoot, "src/zeref/adapters/read-adapters.ts"), "utf8");
    const fn = src.slice(src.indexOf("export async function readMorningBrief"));
    const body = fn.split(/\r?\n\}\r?\n/)[0];
    assert.match(body, /ctx\.getMorningBrief/);
    assert.doesNotMatch(body, /write|fetch|graph/i);
  });
});
