import { expect, test } from "@playwright/test";

/**
 * Phase 12 C175 — data-age badge visible on cockpit panels in fixture mode.
 * Enforced when ZEREF_PHASE12_DATA=1.
 */
const phase12DataReady = process.env.ZEREF_PHASE12_DATA === "1";

test.describe("cockpit data-age phase 12 (C175)", () => {
  test.beforeEach(() => {
    test.skip(
      !phase12DataReady,
      "Set ZEREF_PHASE12_DATA=1 to enforce Phase 12 data-age e2e (C175)",
    );
  });

  test("fixture data-age badge visible on cockpit", async ({ page }) => {
    await page.goto("/cockpit");
    // fixture mode: at least one panel badge with state "fixture"
    const badge = page.getByTestId("data-age-badge-fixture").first();
    await expect(badge).toBeVisible({ timeout: 5000 });
  });

  test("ZEREF_PHASE12_DATA gate documented", () => {
    // documents the env gate (C171)
    expect(process.env.ZEREF_PHASE12_DATA).toBe("1");
  });
});
