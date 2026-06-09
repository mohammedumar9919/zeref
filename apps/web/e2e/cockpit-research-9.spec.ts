import { expect, test } from "@playwright/test";

/**
 * Phase 9 C87 — research hub at /cockpit/research + topic detail.
 *
 * Wave 4: enforced when ZEREF_PHASE9_RESEARCH=1 (P9-C research UI).
 * `verify:phase-9` sets ZEREF_PHASE9_RESEARCH=1 in CI; hard enforcement after P9-C lands.
 *
 * Contract testids (phase-9-contract C87, DESIGN_SYSTEM carry-forward C26):
 * - `research-hub` — full research hub surface on /cockpit/research
 * - `panel-research` — left-stack research panel (cockpit-layout.spec.ts)
 */
const phase9ResearchReady = process.env.ZEREF_PHASE9_RESEARCH === "1";

/** Wave 4 — P9-C research-hub UI (enforced when ZEREF_PHASE9_RESEARCH=1) */
const wave4ResearchUiReady = true;

test.describe("cockpit research phase 9 (C87)", () => {
  test.beforeEach(() => {
    test.skip(
      !phase9ResearchReady || !wave4ResearchUiReady,
      "Wave 4 — P9-C research-hub UI; set ZEREF_PHASE9_RESEARCH=1 in verify:phase-9 when enforced",
    );
  });

  test("research hub is visible on research route", async ({ page }) => {
    await page.goto("/cockpit/research");
    await expect(page.getByTestId("research-hub")).toBeVisible();
  });

  test("cockpit research panel remains visible from layout shell", async ({ page }) => {
    await page.goto("/cockpit");
    await expect(page.getByTestId("panel-research")).toBeVisible();
  });
});
