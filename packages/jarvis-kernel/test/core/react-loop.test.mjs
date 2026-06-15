import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { z } from "zod";

const pkgRoot = join(dirname(fileURLToPath(import.meta.url)), "../..");
const core = await import(
  pathToFileURL(join(pkgRoot, "dist/core/index.js")).href
);

const { runAgentLoop, ToolInputSchema } = core;

const READ_TOOL = {
  name: "get_cockpit_summary",
  description: "Live cockpit summary",
  inputSchema: ToolInputSchema,
  riskTier: "read",
  idempotent: true,
  costHint: "cheap",
};

const WRITE_HIGH_TOOL = {
  name: "enqueue_job",
  description: "Enqueue a background job",
  inputSchema: ToolInputSchema,
  riskTier: "write-high",
  idempotent: true,
  costHint: "moderate",
};

function fakeLlm(script) {
  let call = 0;
  return {
    async predict() {
      const step = script[call] ?? script[script.length - 1];
      call += 1;
      return step;
    },
  };
}

function fakeExecutor(results = {}) {
  const calls = [];
  return {
    calls,
    async execute(name, args) {
      calls.push({ name, args });
      return results[name] ?? { ok: true, data: { name, args } };
    },
  };
}

describe("@zeref/jarvis-kernel core react-loop", () => {
  it("completes with finish text on first predict", async () => {
    const llm = fakeLlm([{ text: "Right then, all sorted.", tokensUsed: 12 }]);
    const executor = fakeExecutor();
    const streamed = [];

    const result = await runAgentLoop({
      runId: "run-1",
      transcript: "Hello Jarvis",
      llm,
      toolExecutor: executor,
      tools: [READ_TOOL],
      onStep: (s) => streamed.push(s.type),
    });

    assert.equal(result.terminalReason, "completed");
    assert.equal(result.finalText, "Right then, all sorted.");
    assert.equal(executor.calls.length, 0);
    assert.deepEqual(streamed, ["llm_predict", "terminal"]);
  });

  it("executes read tool then finishes", async () => {
    const llm = fakeLlm([
      {
        toolCall: { name: "get_cockpit_summary", args: {}, id: "tc-1" },
        tokensUsed: 20,
      },
      { text: "Cockpit looks healthy.", tokensUsed: 15 },
    ]);
    const executor = fakeExecutor({
      get_cockpit_summary: { ok: true, data: { panels: 4 } },
    });

    const result = await runAgentLoop({
      runId: "run-2",
      transcript: "What's the cockpit status?",
      llm,
      toolExecutor: executor,
      tools: [READ_TOOL],
      now: () => "2026-06-15T12:00:00.000Z",
    });

    assert.equal(result.terminalReason, "completed");
    assert.equal(executor.calls.length, 1);
    assert.equal(result.audit.entries.length, 1);
    assert.equal(result.audit.entries[0].toolName, "get_cockpit_summary");
    assert.equal(result.audit.entries[0].riskTier, "read");
    assert.equal(result.audit.entries[0].ts, "2026-06-15T12:00:00.000Z");
    const types = result.steps.map((s) => s.type);
    assert.deepEqual(types, [
      "llm_predict",
      "tool_execute",
      "llm_predict",
      "terminal",
    ]);
  });

  it("pauses on write-high until confirmed", async () => {
    const llm = fakeLlm([
      {
        toolCall: { name: "enqueue_job", args: { jobType: "report" } },
        tokensUsed: 10,
      },
    ]);
    const executor = fakeExecutor();

    const blocked = await runAgentLoop({
      runId: "run-3",
      transcript: "Enqueue a report job",
      llm,
      toolExecutor: executor,
      tools: [WRITE_HIGH_TOOL],
    });

    assert.equal(blocked.terminalReason, "awaiting_confirm");
    assert.equal(executor.calls.length, 0);
    assert.ok(blocked.pendingConfirm);
    assert.equal(blocked.pendingConfirm.toolName, "enqueue_job");
    assert.equal(
      blocked.steps.some((s) => s.type === "confirm_required"),
      true,
    );

    const resumed = await runAgentLoop({
      runId: "run-3",
      transcript: "Enqueue a report job",
      llm: fakeLlm([
        {
          toolCall: { name: "enqueue_job", args: { jobType: "report" } },
          tokensUsed: 10,
        },
        { text: "Job enqueued.", tokensUsed: 8 },
      ]),
      toolExecutor: executor,
      tools: [WRITE_HIGH_TOOL],
      confirmed: true,
    });

    assert.equal(resumed.terminalReason, "completed");
    assert.equal(executor.calls.length, 1);
    assert.equal(resumed.audit.entries.length, 1);
  });

  it("aborts when kill signal is set", async () => {
    const controller = new AbortController();
    controller.abort();

    const result = await runAgentLoop({
      runId: "run-4",
      transcript: "stop",
      llm: fakeLlm([{ text: "never" }]),
      toolExecutor: fakeExecutor(),
      tools: [],
      killSignal: controller.signal,
    });

    assert.equal(result.terminalReason, "killed");
    assert.equal(result.steps.at(-1)?.reason, "killed");
  });

  it("stops on budget exhaustion after max iterations", async () => {
    const llm = fakeLlm(
      Array.from({ length: 10 }, () => ({
        toolCall: { name: "get_cockpit_summary", args: {} },
        tokensUsed: 1,
      })),
    );
    const executor = fakeExecutor();

    const result = await runAgentLoop({
      runId: "run-5",
      transcript: "loop forever",
      llm,
      toolExecutor: executor,
      tools: [READ_TOOL],
      budgets: { maxIterations: 2, wallClockMs: 60_000, tokenBudget: 10_000 },
    });

    assert.equal(result.terminalReason, "budget_exhausted");
    assert.equal(executor.calls.length, 2);
    assert.equal(result.audit.entries.length, 2);
  });

  it("stops when token budget exceeded", async () => {
    const llm = fakeLlm([
      { toolCall: { name: "get_cockpit_summary", args: {} }, tokensUsed: 600 },
    ]);
    const executor = fakeExecutor();

    const result = await runAgentLoop({
      runId: "run-6",
      transcript: "heavy tokens",
      llm,
      toolExecutor: executor,
      tools: [READ_TOOL],
      budgets: { maxIterations: 8, wallClockMs: 60_000, tokenBudget: 500 },
    });

    assert.equal(result.terminalReason, "budget_exhausted");
    assert.equal(executor.calls.length, 1);
  });
});

describe("@zeref/jarvis-kernel core tool descriptor", () => {
  it("parses args via zod record schema", () => {
    const schema = z.record(z.unknown());
    const parsed = schema.parse({ foo: "bar" });
    assert.deepEqual(parsed, { foo: "bar" });
  });
});
