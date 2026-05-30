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
