import { expect, test } from "@playwright/test";

/**
 * Phase 8 C76 — calendar scheduler (week/list MVP).
 *
 * Wave 4: enforced when ZEREF_PHASE8_PRODUCT=1 (P8-D @ 76eaf64).
 * `verify:phase-8` sets ZEREF_PHASE8_PRODUCT=1 in CI; hard enforcement after P8-D lands.
 *
 * Contract testids (phase-8-contract C76, DESIGN_SYSTEM carry-forward C26):
 * - `calendar-scheduler` — full scheduler surface on /cockpit/calendar
 * - `panel-calendar` — left-stack calendar panel (cockpit-layout.spec.ts)
 */
const phase8ProductReady = process.env.ZEREF_PHASE8_PRODUCT === "1";

/** Wave 4 — P8-D calendar-scheduler UI @ 76eaf64 */
const wave4CalendarUiReady = true;

test.describe("cockpit calendar phase 8 (C76)", () => {
  test.beforeEach(() => {
    test.skip(
      !phase8ProductReady || !wave4CalendarUiReady,
      "Wave 4 — P8-D calendar-scheduler UI; set ZEREF_PHASE8_PRODUCT=1 in verify:phase-8 when enforced",
    );
  });

  test("calendar scheduler is visible on calendar route", async ({ page }) => {
    await page.goto("/cockpit/calendar");
    await expect(page.getByTestId("calendar-scheduler")).toBeVisible();
  });

  test("cockpit calendar panel remains visible from layout shell", async ({ page }) => {
    await page.goto("/cockpit");
    await expect(page.getByTestId("panel-calendar")).toBeVisible();
  });
});
