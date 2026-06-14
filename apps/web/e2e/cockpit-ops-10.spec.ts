import { expect, test } from "@playwright/test";

/**
 * Phase 10 C119 — ops worker-health honesty in fixture mode.
 *
 * Enforced when ZEREF_PHASE10_OPS=1 (P10-E verify gate).
 * `verify:phase-10` sets ZEREF_PHASE10_OPS=1 in CI; hard enforcement after P10-B lands.
 *
 * Contract (phase-10-contract C113, C119):
 * - GET /api/v1/ops/worker-health reachable
 * - ZEREF_BFF_FIXTURE=1 returns honest `{ consuming: false, source: "fixture" }`
 */
const phase10OpsReady = process.env.ZEREF_PHASE10_OPS === "1";
const bffFixtureReady = process.env.ZEREF_BFF_FIXTURE === "1";

/** Wave 2 — P10-B worker-health BFF (enforced when ZEREF_PHASE10_OPS=1) */
const wave2OpsReady = true;

test.describe("cockpit ops phase 10 (C119)", () => {
  test.beforeEach(() => {
    test.skip(
      !phase10OpsReady || !bffFixtureReady || !wave2OpsReady,
      "Wave 2 — P10-B ops worker-health; set ZEREF_PHASE10_OPS=1 and ZEREF_BFF_FIXTURE=1 in verify:phase-10",
    );
  });

  test("worker-health returns honest fixture response", async ({ request }) => {
    const response = await request.get("/api/v1/ops/worker-health");
    expect(response.ok()).toBeTruthy();

    const body = await response.json();
    expect(body).toEqual({
      consuming: false,
      source: "fixture",
    });
  });
});
