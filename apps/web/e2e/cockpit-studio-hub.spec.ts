import { expect, test } from "@playwright/test";

/**
 * P8 hotfix — studio hub at /cockpit/studio (P8-HOTFIX-B @ f52e0ef).
 *
 * Enforced when ZEREF_PHASE8_PRODUCT=1 + ZEREF_BFF_FIXTURE=1.
 * `verify:hotfix-p8` hard-fails on non-zero (no warn-only skip).
 *
 * Contract testids:
 * - `studio-hub` — full studio hub surface on /cockpit/studio
 */
const phase8ProductReady = process.env.ZEREF_PHASE8_PRODUCT === "1";
const bffFixtureReady = process.env.ZEREF_BFF_FIXTURE === "1";

/** Wave 2 — P8-HOTFIX-B StudioHub UI (enforced when ZEREF_PHASE8_PRODUCT=1) */
const wave2StudioHubReady = true;

test.describe("cockpit studio hub hotfix (P8-HOTFIX-B)", () => {
  test.beforeEach(() => {
    test.skip(
      !phase8ProductReady || !bffFixtureReady || !wave2StudioHubReady,
      "P8 hotfix — StudioHub UI; set ZEREF_PHASE8_PRODUCT=1 and ZEREF_BFF_FIXTURE=1 in verify:hotfix-p8",
    );
  });

  test("studio hub is visible on studio route", async ({ page }) => {
    await page.goto("/cockpit/studio");
    await expect(page.getByTestId("studio-hub")).toBeVisible();
  });
});
