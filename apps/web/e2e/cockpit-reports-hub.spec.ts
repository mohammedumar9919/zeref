import { expect, test } from "@playwright/test";

/**
 * P8 hotfix — reports hub + artifact detail (P8-HOTFIX-C @ 019e7bd).
 *
 * Enforced when ZEREF_PHASE8_PRODUCT=1 + ZEREF_BFF_FIXTURE=1.
 * `verify:hotfix-p8` hard-fails on non-zero (no warn-only skip).
 *
 * Contract testids:
 * - `reports-hub` — full reports hub surface on /cockpit/reports
 * - `report-artifact-detail` — artifact detail for ?artifact= deep-link
 *
 * Fixture artifact id: 550e8400-e29b-41d4-a716-446655440000
 */
const phase8ProductReady = process.env.ZEREF_PHASE8_PRODUCT === "1";
const bffFixtureReady = process.env.ZEREF_BFF_FIXTURE === "1";

/** Wave 2 — P8-HOTFIX-C ReportsHub UI (enforced when ZEREF_PHASE8_PRODUCT=1) */
const wave2ReportsHubReady = true;

const FIXTURE_ARTIFACT_ID = "550e8400-e29b-41d4-a716-446655440000";

test.describe("cockpit reports hub hotfix (P8-HOTFIX-C)", () => {
  test.beforeEach(() => {
    test.skip(
      !phase8ProductReady || !bffFixtureReady || !wave2ReportsHubReady,
      "P8 hotfix — ReportsHub UI; set ZEREF_PHASE8_PRODUCT=1 and ZEREF_BFF_FIXTURE=1 in verify:hotfix-p8",
    );
  });

  test("reports hub is visible on reports route", async ({ page }) => {
    await page.goto("/cockpit/reports");
    await expect(page.getByTestId("reports-hub")).toBeVisible();
  });

  test("report artifact detail is visible for artifact query param", async ({ page }) => {
    await page.goto(`/cockpit/reports?artifact=${FIXTURE_ARTIFACT_ID}`);
    await expect(page.getByTestId("report-artifact-detail")).toBeVisible();
  });
});
