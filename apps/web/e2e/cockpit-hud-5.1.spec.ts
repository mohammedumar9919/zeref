import { expect, test } from "@playwright/test";

/**
 * Phase 5.1 C48 — Luke HUD chrome, simulated telemetry/audio, point-cloud globe.
 * Skipped until UI agent P5.1-A lands; verify:phase-5.1 sets ZEREF_PHASE51_UI=1 to enforce.
 */
const phase51UiReady = process.env.ZEREF_PHASE51_UI === "1";

test.describe("cockpit HUD phase 5.1 (C48)", () => {
  test.beforeEach(({ }, testInfo) => {
    test.skip(
      !phase51UiReady,
      "UI agent P5.1-A — set ZEREF_PHASE51_UI=1 in verify:phase-5.1 to enforce C48",
    );
  });

  test("hud header chrome", async ({ page }) => {
    await page.goto("/cockpit");
    await expect(page.getByTestId("hud-header")).toBeVisible();
  });

  test("hud footer chrome", async ({ page }) => {
    await page.goto("/cockpit");
    await expect(page.getByTestId("hud-footer")).toBeVisible();
  });

  test("telemetry strip shows simulated badge", async ({ page }) => {
    await page.goto("/cockpit");
    await expect(page.getByTestId("telemetry-simulated")).toBeVisible();
  });

  test("live AUDIO I/O replaces simulated placeholder (Phase 6 C58)", async ({
    page,
  }) => {
    await page.goto("/cockpit");
    await expect(page.getByTestId("audio-io-live")).toBeVisible();
    await expect(page.getByTestId("audio-io-simulated")).toHaveCount(0);
  });

  test("globe canvas uses point-cloud mode", async ({ page }) => {
    await page.goto("/cockpit");
    const canvas = page.getByTestId("globe-canvas");
    await expect(canvas).toBeVisible({ timeout: 15_000 });
    await expect(canvas).toHaveAttribute("data-globe-mode", "point-cloud");
  });
});
