import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const webRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const typedTurn = await import(
  pathToFileURL(join(webRoot, "lib/jarvis/typed-turn.ts")).href
);

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const RUN_ID = "550e8400-e29b-41d4-a716-446655440011";
const originalFetch = globalThis.fetch;

function mockFetch(status, body) {
  const calls = [];
  globalThis.fetch = async (url, init) => {
    calls.push({ url: String(url), init, body: JSON.parse(init.body) });
    return new Response(JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json" },
    });
  };
  return calls;
}

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe("typed-turn (CLOUD-C1)", () => {
  it("sendTypedTurn POSTs {turnId, transcript} with a uuid turnId", async () => {
    const calls = mockFetch(200, { runId: RUN_ID, resultText: "Cockpit ready." });
    const result = await typedTurn.sendTypedTurn("show me the cockpit dashboard");

    assert.equal(calls.length, 1);
    assert.equal(calls[0].url, "/api/v1/jarvis/run");
    assert.equal(calls[0].init.method, "POST");
    assert.match(calls[0].body.turnId, UUID_RE);
    assert.equal(calls[0].body.transcript, "show me the cockpit dashboard");
    assert.equal(calls[0].body.confirmed, undefined);
    assert.equal(calls[0].body.runId, undefined);
    assert.equal(result.resultText, "Cockpit ready.");
  });

  it("sendTypedTurn trims the transcript", async () => {
    const calls = mockFetch(200, { runId: RUN_ID, resultText: "ok" });
    await typedTurn.sendTypedTurn("  hello jarvis  ");
    assert.equal(calls[0].body.transcript, "hello jarvis");
  });

  it("sendTypedTurn surfaces pendingConfirm for write-high tools", async () => {
    mockFetch(200, {
      runId: RUN_ID,
      resultText: "Shall I proceed with enqueue job?",
      terminalReason: "awaiting_confirm",
      pendingConfirm: { toolName: "enqueue_job", args: { jobType: "report" } },
    });
    const result = await typedTurn.sendTypedTurn("enqueue a report job");
    assert.equal(result.pendingConfirm.toolName, "enqueue_job");
    assert.equal(result.runId, RUN_ID);
  });

  it("confirmTypedTurn sends confirmed:true, the given runId and a fresh turnId", async () => {
    const calls = mockFetch(200, { runId: RUN_ID, resultText: "Job enqueued successfully." });
    const result = await typedTurn.confirmTypedTurn("enqueue a report job", RUN_ID);

    assert.equal(calls[0].body.confirmed, true);
    assert.equal(calls[0].body.runId, RUN_ID);
    assert.equal(calls[0].body.transcript, "enqueue a report job");
    assert.match(calls[0].body.turnId, UUID_RE);
    assert.notEqual(calls[0].body.turnId, RUN_ID);
    assert.equal(result.resultText, "Job enqueued successfully.");
  });

  it("non-2xx throws with the server error text", async () => {
    mockFetch(500, { error: "llm upstream exploded" });
    await assert.rejects(
      () => typedTurn.sendTypedTurn("show me the cockpit dashboard"),
      (err) => err instanceof Error && err.message === "llm upstream exploded",
    );
  });

  it("non-2xx without an error body still throws", async () => {
    globalThis.fetch = async () => new Response("gateway down", { status: 502 });
    await assert.rejects(
      () => typedTurn.confirmTypedTurn("enqueue a report job", RUN_ID),
      (err) => err instanceof Error && /502/.test(err.message),
    );
  });

  it("exports friendly error copy distinct from raw server errors", () => {
    assert.equal(typedTurn.TYPED_TURN_ERROR_COPY, "Jarvis couldn't answer — try again");
    assert.equal(typedTurn.TYPED_TURN_CANCEL_COPY, "Cancelled — nothing queued.");
  });
});
