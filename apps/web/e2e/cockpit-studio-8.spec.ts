import { expect, test } from "@playwright/test";

/**
 * Phase 8 C75 — studio editor at /cockpit/studio/[entityId].
 *
 * Wave 4: enforced when ZEREF_PHASE8_PRODUCT=1 (P8-C @ c159de9).
 * `verify:phase-8` sets ZEREF_PHASE8_PRODUCT=1 in CI; hard enforcement after P8-C lands.
 *
 * Contract testids (phase-8-contract C75, DESIGN_SYSTEM carry-forward C26):
 * - `studio-editor` — full editor surface on entity deep-link
 * - `panel-studio` — left-stack studio panel (cockpit-layout.spec.ts)
 */
const phase8ProductReady = process.env.ZEREF_PHASE8_PRODUCT === "1";

/** Wave 4 — P8-C studio-editor UI @ c159de9 */
const wave4StudioUiReady = true;

test.describe("cockpit studio phase 8 (C75)", () => {
  test.beforeEach(() => {
    test.skip(
      !phase8ProductReady || !wave4StudioUiReady,
      "Wave 4 — P8-C studio-editor UI; set ZEREF_PHASE8_PRODUCT=1 in verify:phase-8 when enforced",
    );
  });

  test("studio editor is visible on entity deep-link", async ({ page }) => {
    await page.goto("/cockpit/studio/550e8400-e29b-41d4-a716-446655440001");
    await expect(page.getByTestId("studio-editor")).toBeVisible();
  });

  test("cockpit studio panel remains visible from layout shell", async ({ page }) => {
    await page.goto("/cockpit");
    await expect(page.getByTestId("panel-studio")).toBeVisible();
  });
});
