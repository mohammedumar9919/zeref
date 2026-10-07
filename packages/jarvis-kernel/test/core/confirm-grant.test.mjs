import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const pkgRoot = join(dirname(fileURLToPath(import.meta.url)), "../..");
const core = await import(
  pathToFileURL(join(pkgRoot, "dist/core/index.js")).href
);

const { runAgentLoop, ToolInputSchema, hashArgs, UNKNOWN_TOOL_REPLY } = core;

function tool(name, riskTier) {
  return {
    name,
    description: name,
    inputSchema: ToolInputSchema,
    riskTier,
    idempotent: true,
    costHint: "cheap",
  };
}

const ENQUEUE = tool("enqueue_job", "write-high");
const FORGET = tool("vault_forget", "write-high");
const READ = tool("get_cockpit_summary", "read");
const TOOLS = [ENQUEUE, FORGET, READ];

const REPORT_ARGS = { jobType: "report" };

function scriptedLlm(script) {
  let call = 0;
  return {
    async predict() {
      const step = script[call] ?? { text: "Done." };
      call += 1;
      return step;
    },
  };
}

function fakeExecutor() {
  const calls = [];
  return {
    calls,
    async execute(name, args) {
      calls.push({ name, args });
      return { ok: true, data: { name } };
    },
  };
}

function enqueueThenFinish(args = REPORT_ARGS) {
  return scriptedLlm([
    { toolCall: { name: "enqueue_job", args } },
    { text: "Job enqueued." },
  ]);
}

function grant(overrides = {}) {
  return {
    runId: "run-a",
    toolName: "enqueue_job",
    argsHash: hashArgs(REPORT_ARGS),
    ...overrides,
  };
}

describe("@zeref/jarvis-kernel confirm grants (K1)", () => {
  it("pendingConfirm carries the argsHash of the blocked call", async () => {
    const executor = fakeExecutor();
    const result = await runAgentLoop({
      runId: "run-a",
      transcript: "enqueue a report job",
      llm: enqueueThenFinish(),
      toolExecutor: executor,
      tools: TOOLS,
    });
    assert.equal(result.terminalReason, "awaiting_confirm");
    assert.equal(result.pendingConfirm.argsHash, hashArgs(REPORT_ARGS));
    assert.equal(executor.calls.length, 0);
  });

  it("a matching grant executes the write-high call once", async () => {
    const executor = fakeExecutor();
    const result = await runAgentLoop({
      runId: "run-a",
      transcript: "enqueue a report job",
      llm: enqueueThenFinish(),
      toolExecutor: executor,
      tools: TOOLS,
      confirmGrant: grant(),
    });
    assert.equal(result.terminalReason, "completed");
    assert.equal(executor.calls.length, 1);
    assert.equal(result.audit.entries[0].argsHash, hashArgs(REPORT_ARGS));
  });

  it("a grant for tool A does not approve tool B", async () => {
    const executor = fakeExecutor();
    const result = await runAgentLoop({
      runId: "run-a",
      transcript: "forget that",
      llm: scriptedLlm([{ toolCall: { name: "vault_forget", args: REPORT_ARGS } }]),
      toolExecutor: executor,
      tools: TOOLS,
      confirmGrant: grant(),
    });
    assert.equal(result.terminalReason, "awaiting_confirm");
    assert.equal(result.pendingConfirm.toolName, "vault_forget");
    assert.equal(executor.calls.length, 0);
  });

  it("the same tool with different args is rejected", async () => {
    const executor = fakeExecutor();
    const result = await runAgentLoop({
      runId: "run-a",
      transcript: "enqueue a research job",
      llm: enqueueThenFinish({ jobType: "research" }),
      toolExecutor: executor,
      tools: TOOLS,
      confirmGrant: grant(),
    });
    assert.equal(result.terminalReason, "awaiting_confirm");
    assert.equal(executor.calls.length, 0);
  });

  it("a grant from another runId is rejected", async () => {
    const executor = fakeExecutor();
    const result = await runAgentLoop({
      runId: "run-b",
      transcript: "enqueue a report job",
      llm: enqueueThenFinish(),
      toolExecutor: executor,
      tools: TOOLS,
      confirmGrant: grant({ runId: "run-a" }),
    });
    assert.equal(result.terminalReason, "awaiting_confirm");
    assert.equal(executor.calls.length, 0);
  });

  it("the grant is consumed: a second identical write-high call awaits confirm", async () => {
    const executor = fakeExecutor();
    const result = await runAgentLoop({
      runId: "run-a",
      transcript: "enqueue two report jobs",
      llm: scriptedLlm([
        { toolCall: { name: "enqueue_job", args: REPORT_ARGS, id: "tc-1" } },
        { toolCall: { name: "enqueue_job", args: REPORT_ARGS, id: "tc-2" } },
        { text: "Both queued." },
      ]),
      toolExecutor: executor,
      tools: TOOLS,
      confirmGrant: grant(),
    });
    assert.equal(executor.calls.length, 1);
    assert.equal(result.terminalReason, "awaiting_confirm");
    assert.equal(result.pendingConfirm.toolName, "enqueue_job");
  });

  it("a bare confirmed: true approves nothing", async () => {
    const executor = fakeExecutor();
    const result = await runAgentLoop({
      runId: "run-a",
      transcript: "enqueue a report job",
      llm: enqueueThenFinish(),
      toolExecutor: executor,
      tools: TOOLS,
      confirmed: true,
    });
    assert.equal(result.terminalReason, "awaiting_confirm");
    assert.equal(executor.calls.length, 0);
  });

  it("read tools still run without any grant", async () => {
    const executor = fakeExecutor();
    const result = await runAgentLoop({
      runId: "run-a",
      transcript: "cockpit",
      llm: scriptedLlm([
        { toolCall: { name: "get_cockpit_summary", args: {} } },
        { text: "All good." },
      ]),
      toolExecutor: executor,
      tools: TOOLS,
    });
    assert.equal(result.terminalReason, "completed");
    assert.equal(executor.calls.length, 1);
  });

  it("an unknown tool is never executed and the run ends with a refusal", async () => {
    const executor = fakeExecutor();
    const result = await runAgentLoop({
      runId: "run-a",
      transcript: "drop the database",
      llm: scriptedLlm([
        { toolCall: { name: "drop_database", args: {} } },
        { text: "should never be reached" },
      ]),
      toolExecutor: executor,
      tools: TOOLS,
      confirmGrant: { runId: "run-a", toolName: "drop_database", argsHash: hashArgs({}) },
    });
    assert.equal(executor.calls.length, 0);
    assert.equal(result.terminalReason, "completed");
    assert.equal(result.finalText, UNKNOWN_TOOL_REPLY);
    assert.equal(result.pendingConfirm, undefined);
    assert.equal(result.audit.entries.length, 0);
    const failed = result.steps.find((s) => s.type === "tool_execute");
    assert.equal(failed.ok, false);
    assert.equal(failed.toolName, "drop_database");
  });
});
