import { randomUUID } from "node:crypto";

import { expect, test } from "@playwright/test";

/**
 * Phase 11 C161 — agentic JARVIS slow path under mock LLM.
 *
 * Enforced when ZEREF_PHASE11_AGENT=1 (P11-D verify gate).
 * `verify:phase-11` sets ZEREF_PHASE11_AGENT=1 in CI.
 *
 * Contract (phase-11-contract C157, C161):
 * - POST /api/v1/jarvis/run completes read turns
 * - contractSteps include predict + tool_call agent.step shapes
 * - write-high without confirm returns awaiting_confirm / pendingConfirm
 */
const phase11AgentReady = process.env.ZEREF_PHASE11_AGENT === "1";
const bffFixtureReady = process.env.ZEREF_BFF_FIXTURE === "1";

test.describe("jarvis agent phase 11 (C161)", () => {
  test.beforeEach(() => {
    test.skip(
      !phase11AgentReady || !bffFixtureReady,
      "Set ZEREF_PHASE11_AGENT=1 and ZEREF_BFF_FIXTURE=1 to enforce jarvis-agent-11 e2e (C161)",
    );
  });

  test("POST /api/v1/jarvis/run completes read intent", async ({ request }) => {
    const response = await request.post("/api/v1/jarvis/run", {
      data: {
        turnId: randomUUID(),
        transcript: "show cockpit dashboard",
      },
    });

    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    expect(body.terminalReason).toBe("completed");
    expect(
      body.toolCalls.some(
        (call: { name: string }) => call.name === "get_cockpit_summary",
      ),
    ).toBeTruthy();
  });

  test("contractSteps include predict and tool_call types", async ({ request }) => {
    const response = await request.post("/api/v1/jarvis/run", {
      data: {
        turnId: randomUUID(),
        transcript: "show me the cockpit dashboard",
      },
    });

    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    const stepTypes = (body.contractSteps ?? []).map(
      (step: { type: string }) => step.type,
    );
    expect(stepTypes).toContain("predict");
    expect(stepTypes).toContain("tool_call");
  });

  test("write-high without confirm returns awaiting_confirm", async ({ request }) => {
    const response = await request.post("/api/v1/jarvis/run", {
      data: {
        turnId: randomUUID(),
        transcript: "enqueue a report job",
      },
    });

    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    expect(body.terminalReason).toBe("awaiting_confirm");
    expect(body.pendingConfirm).toBeTruthy();
    expect(body.pendingConfirm.toolName).toBe("enqueue_job");
    expect(body.toolCalls).toEqual([]);
  });
});
