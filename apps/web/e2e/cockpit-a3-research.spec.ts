import { expect, test } from "@playwright/test";

/**
 * CLOUD-A3 — research intel lite (outliers + weekly brief) under fixture mode.
 */
const FIXTURE_TOPIC_ID = "770e8400-e29b-41d4-a716-446655440001";

test.describe("CLOUD-A3 research intel", () => {
  test("research hub shows outliers and a readable weekly brief", async ({ page }) => {
    await page.goto("/cockpit/research");
    await expect(page.getByTestId("research-hub")).toBeVisible();
    await expect(page.getByTestId("research-intel")).toBeVisible();
    await expect(page.getByTestId("research-outliers")).toBeVisible();
    await expect(page.getByTestId("research-outlier-HIT999")).toBeVisible();
    await expect(page.getByTestId("research-weekly-brief")).toBeVisible();
    await expect(page.getByTestId("research-weekly-brief")).toContainText("HIT999");
    await expect(page.getByTestId("research-weekly-brief")).toContainText(/5(\.|\u00d7|x)/i);
  });

  test("research topic detail also surfaces intel", async ({ page }) => {
    await page.goto(`/cockpit/research/${FIXTURE_TOPIC_ID}`);
    await expect(page.getByTestId("research-topic-detail")).toBeVisible();
    await expect(page.getByTestId("research-intel")).toBeVisible();
    await expect(page.getByTestId("research-weekly-brief")).toContainText("HIT999");
  });
});
