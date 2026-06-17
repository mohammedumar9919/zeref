import { expect, test } from "@playwright/test";

/**
 * Phase 10.5 C128 — single EventSource + SSE state survives cockpit panel nav.
 *
 * Enforced when ZEREF_PHASE105_STABILITY=1 (P10.5-D verify gate).
 * `verify:phase-10.5` sets ZEREF_PHASE105_STABILITY=1 in CI.
 *
 * Contract (phase-10.5-contract C125–C128):
 * - VoiceProvider layout owns one EventSource for events/stream
 * - TelemetryStrip consumes shared stream (no second EventSource)
 * - Brain/voice state persists across client-side panel navigation
 */
const phase105StabilityReady = process.env.ZEREF_PHASE105_STABILITY === "1";

const MEMORY_SAVED_PAYLOAD = {
  type: "memory.saved",
  entryId: "a1000000-0000-4000-8000-000000000001",
  tier: "episodic",
  ts: "2026-05-31T12:00:00.500Z",
  simulated: true,
} as const;

test.describe("cockpit stability phase 10.5 (C128)", () => {
  test.beforeEach(() => {
    test.skip(
      !phase105StabilityReady,
      "Set ZEREF_PHASE105_STABILITY=1 to enforce Phase 10.5 stability e2e (C128)",
    );
  });

  test("single EventSource and SSE brain state survive panel navigation", async ({
    page,
  }) => {
    await page.addInitScript(() => {
      const NativeES = window.EventSource;
      const tracker = {
        created: 0,
        open: 0,
        maxOpen: 0,
      };
      (
        window as unknown as { __zerefEventSourceTracker?: typeof tracker }
      ).__zerefEventSourceTracker = tracker;

      window.EventSource = function (url, init) {
        tracker.created += 1;
        tracker.open += 1;
        tracker.maxOpen = Math.max(tracker.maxOpen, tracker.open);
        const source = new NativeES(url, init);
        const nativeClose = source.close.bind(source);
        source.close = () => {
          tracker.open = Math.max(0, tracker.open - 1);
          nativeClose();
        };
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
    const globe = page.locator(
      '[data-testid="globe-island"][data-globe-brain-state="memory_saved"]',
    );
    await expect(globe).toBeVisible({ timeout: 5_000 });

    await page.getByRole("link", { name: "Open studio →" }).click();
    await expect(page.getByTestId("cockpit-studio-page")).toBeVisible();
    await expect(globe).toBeVisible();

    await page.getByRole("link", { name: "Open calendar →" }).click();
    await expect(page.getByTestId("calendar-scheduler")).toBeVisible({
      timeout: 10_000,
    });
    await expect(globe).toBeVisible();

    const tracker = await page.evaluate(() => {
      const t = (
        window as unknown as {
          __zerefEventSourceTracker?: {
            created: number;
            open: number;
            maxOpen: number;
          };
        }
      ).__zerefEventSourceTracker;
      return t ?? { created: -1, open: -1, maxOpen: -1 };
    });

    expect(tracker.created).toBe(1);
    expect(tracker.maxOpen).toBe(1);
    expect(tracker.open).toBeLessThanOrEqual(1);
  });
});
