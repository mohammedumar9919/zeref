import { expect, test } from "@playwright/test";

/**
 * Phase 7 C67/C69 — brain globe states + memory.saved SSE.
 *
 * `verify:phase-7` sets `ZEREF_PHASE7_BRAIN=1` to enforce.
 *
 * Contract testids / events (phase-7-contract C67, ADR-027):
 * - `globe-island` exposes `data-globe-brain-state`:
 *   idle | memory_saved | searching | contradiction | entity_changed
 * - SSE `memory.saved` on unified cockpit bus → UI maps to `memory_saved` brain state
 * - C69 perf — attribute update within 150 ms CI tolerance after SSE emit
 */
const phase7BrainReady = process.env.ZEREF_PHASE7_BRAIN === "1";

const MEMORY_SAVED_PAYLOAD = {
  type: "memory.saved",
  entryId: "a1000000-0000-4000-8000-000000000001",
  tier: "episodic",
  ts: "2026-05-31T12:00:00.500Z",
  simulated: true,
} as const;

test.describe("cockpit brain phase 7 (C67)", () => {
  test.beforeEach(() => {
    test.skip(
      !phase7BrainReady,
      "Set ZEREF_PHASE7_BRAIN=1 to enforce Phase 7 brain e2e (C67/C69)",
    );
  });

  test("globe island exposes brain state attribute", async ({ page }) => {
    await page.goto("/cockpit");
    const globe = page.getByTestId("globe-island");
    await expect(globe).toBeVisible();
    await expect(globe).toHaveAttribute(
      "data-globe-brain-state",
      /^(idle|memory_saved|searching|contradiction|entity_changed)$/,
    );
  });

  test("memory.saved SSE updates globe brain state within C69 tolerance", async ({
    page,
  }) => {
    await page.addInitScript(() => {
      const NativeES = window.EventSource;
      window.EventSource = function (url, init) {
        const source = new NativeES(url, init);
        source.addEventListener("memory.saved", () => {
          (
            window as unknown as { __zerefSseMemorySavedAt?: number }
          ).__zerefSseMemorySavedAt = performance.now();
        });
        return source;
      } as unknown as typeof EventSource;
    });

    const sseBody = `event: heartbeat\n\nevent: memory.saved\ndata: ${JSON.stringify(MEMORY_SAVED_PAYLOAD)}\n\n`;

    await page.route("**/api/v1/events/stream", async (route) => {
      await route.fulfill({
        status: 200,
        headers: {
          "Content-Type": "text/event-stream; charset=utf-8",
          "Cache-Control": "no-cache, no-transform",
          Connection: "keep-alive",
        },
        body: sseBody,
      });
    });

    await page.goto("/cockpit");
    const globe = page.getByTestId("globe-island");
    await expect(globe).toBeVisible();
    await expect(globe).toHaveAttribute("data-globe-brain-state", "memory_saved", {
      timeout: 150,
    });

    const latencyMs = await page.evaluate(() => {
      const emittedAt = (
        window as unknown as { __zerefSseMemorySavedAt?: number }
      ).__zerefSseMemorySavedAt;
      return emittedAt ? performance.now() - emittedAt : 9999;
    });
    expect(latencyMs).toBeLessThanOrEqual(150);
  });
});
