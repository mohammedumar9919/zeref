import { expect, test } from "@playwright/test";

/**
 * Phase 6.1 C91–C94 — Luke Tier-2 HUD visual polish (ADR-033).
 *
 * Wired against P6.1-A @ f6a3d01 DOM markers + reference screenshot
 * `docs/design/reference/screenshots/zeref-cockpit-6.1-hud.png`.
 *
 * `verify:phase-6.1` sets `ZEREF_PHASE61_UI=1` and also runs
 * `cockpit-hud-5.1.spec.ts` for C48 carry-forward.
 */
const phase61UiReady = process.env.ZEREF_PHASE61_UI === "1";

const PANEL_TESTIDS = [
  "panel-studio",
  "panel-calendar",
  "panel-reports",
  "panel-research",
] as const;

test.describe("cockpit HUD phase 6.1 (C91–C94)", () => {
  test.beforeEach(() => {
    test.skip(
      !phase61UiReady,
      "P6.1-E — set ZEREF_PHASE61_UI=1 in verify:phase-6.1 to enforce C91–C94",
    );
  });

  test("C91 — hud header status chips (mono labels, cyan accent)", async ({
    page,
  }) => {
    await page.goto("/cockpit");
    const header = page.getByTestId("hud-header");
    await expect(header).toBeVisible();
    await expect(header.locator(".status-chip")).toHaveCount(4);
    await expect(header.getByText("Phase 6.1")).toBeVisible();
    await expect(header.getByText("Zeref operator")).toBeVisible();
    await expect(header.getByText("Command center HUD")).toBeVisible();
  });

  test("C92 — hud footer objective line + telemetry row spacing", async ({
    page,
  }) => {
    await page.goto("/cockpit");
    const footer = page.getByTestId("hud-footer");
    await expect(footer).toBeVisible();

    const objective = footer.locator(".hud-footer-objective");
    await expect(objective).toBeVisible();
    await expect(objective.getByText("Objective")).toBeVisible();
    await expect(objective.getByText(/Instagram ops intelligence/)).toBeVisible();

    const telemetryRow = footer.locator(".hud-footer-telemetry-row");
    await expect(telemetryRow).toBeVisible();
    await expect(telemetryRow.locator(".telemetry-strip")).toBeVisible();
    await expect(telemetryRow.getByTestId("audio-io-live")).toBeVisible();
  });

  test("C93 — glass columns harmonized; panel-* testids preserved", async ({
    page,
  }) => {
    await page.goto("/cockpit");
    await expect(page.locator(".glass-column")).toHaveCount(2);

    for (const testId of PANEL_TESTIDS) {
      const panel = page.getByTestId(testId);
      await expect(panel).toBeVisible();
      await expect(panel).toHaveClass(/hud-panel/);
    }
  });

  test("C94 — telemetry strip + audio I/O polish; honest badges", async ({
    page,
  }) => {
    await page.goto("/cockpit");

    const strip = page.locator(".telemetry-strip[role='status']");
    await expect(strip).toBeVisible();
    await expect(strip.getByText("Telemetry", { exact: true })).toBeVisible();
    await expect(page.getByTestId("telemetry-simulated")).toBeVisible();

    const audio = page.getByTestId("audio-io-live");
    await expect(audio).toBeVisible();
    await expect(audio.getByText("Audio I/O")).toBeVisible();
    await expect(page.getByTestId("audio-io-simulated")).toHaveCount(0);
  });
});
