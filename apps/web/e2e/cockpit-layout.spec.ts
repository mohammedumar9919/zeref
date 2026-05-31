import { expect, test } from "@playwright/test";

test.describe("cockpit layout", () => {
  test("top nav shows Cockpit and Settings only", async ({ page }) => {
    await page.goto("/cockpit");

    const nav = page.getByTestId("top-nav");
    await expect(nav.getByTestId("nav-cockpit")).toBeVisible();
    await expect(nav.getByTestId("nav-settings")).toBeVisible();
    await expect(nav.getByRole("link")).toHaveCount(2);
  });

  test("cockpit renders four panel regions and globe island", async ({ page }) => {
    await page.goto("/cockpit");

    await expect(page.getByTestId("cockpit-grid")).toBeVisible();
    await expect(page.getByTestId("panel-studio")).toBeVisible();
    await expect(page.getByTestId("panel-calendar")).toBeVisible();
    await expect(page.getByTestId("panel-reports")).toBeVisible();
    await expect(page.getByTestId("panel-research")).toBeVisible();
    await expect(page.getByTestId("globe-island")).toBeVisible();
  });

  test("globe canvas loads after client chunk", async ({ page }) => {
    await page.goto("/cockpit");

    await expect(page.getByTestId("globe-canvas")).toBeVisible({
      timeout: 15_000,
    });
  });

  test("root redirects to cockpit", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/\/cockpit$/);
  });

  test("settings page reachable from nav", async ({ page }) => {
    await page.goto("/cockpit");
    await page.getByTestId("nav-settings").click();
    await expect(page.getByTestId("settings-page")).toBeVisible();
  });

  test("panel deep links highlight focused region", async ({ page }) => {
    await page.goto("/cockpit/studio");
    await expect(page.getByTestId("cockpit-studio-page")).toBeVisible();
    await expect(page.getByTestId("panel-studio")).toHaveClass(/ring-hud-cyan/);
  });
});

test.describe("cockpit HUD phase 5.1 (C48)", () => {
  test("hud header and footer chrome", async ({ page }) => {
    await page.goto("/cockpit");
    await expect(page.getByTestId("hud-header")).toBeVisible();
    await expect(page.getByTestId("hud-footer")).toBeVisible();
  });

  test("telemetry strip shows simulated badge", async ({ page }) => {
    await page.goto("/cockpit");
    await expect(page.getByTestId("telemetry-simulated")).toBeVisible({
      timeout: 10_000,
    });
  });

  test("live AUDIO I/O replaces simulated placeholder (Phase 6 C58)", async ({
    page,
  }) => {
    await page.goto("/cockpit");
    await expect(page.getByTestId("audio-io-live")).toBeVisible();
    await expect(page.getByTestId("audio-io-simulated")).toHaveCount(0);
  });

  test("globe island is full-bleed hero without hud-panel chrome", async ({
    page,
  }) => {
    await page.goto("/cockpit");
    const island = page.getByTestId("globe-island");
    await expect(island).toBeVisible();
    await expect(island).toHaveClass(/globe-hero/);
    await expect(island).not.toHaveClass(/hud-panel/);

    const box = await island.boundingBox();
    expect(box?.height ?? 0).toBeGreaterThanOrEqual(320);
  });

  test("globe canvas uses point-cloud mode", async ({ page }) => {
    await page.goto("/cockpit");
    const canvas = page.getByTestId("globe-canvas");
    await expect(canvas).toBeVisible({ timeout: 15_000 });
    await expect(canvas).toHaveAttribute("data-globe-mode", "point-cloud");
    await expect(page.getByTestId("globe-island")).toHaveAttribute(
      "data-globe-mode",
      "point-cloud",
    );
  });
});
