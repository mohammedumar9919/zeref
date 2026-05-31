import { expect, test } from "@playwright/test";

/**
 * Phase 6 C59 — PTT, live AUDIO I/O, globe voice states.
 * Skipped until UI agent P6-D lands; verify:phase-6 sets ZEREF_PHASE6_VOICE=1 to enforce.
 */
const phase6VoiceReady = process.env.ZEREF_PHASE6_VOICE === "1";

test.describe("cockpit voice phase 6 (C59)", () => {
  test.beforeEach(() => {
    test.skip(
      !phase6VoiceReady,
      "UI agent P6-D — set ZEREF_PHASE6_VOICE=1 in verify:phase-6 to enforce C59",
    );
  });

  test("PTT button is visible and accessible", async ({ page }) => {
    await page.goto("/cockpit");
    const ptt = page.getByTestId("ptt-button");
    await expect(ptt).toBeVisible();
    await expect(ptt).toBeEnabled();
  });

  test("live AUDIO I/O replaces simulated placeholder", async ({ page }) => {
    await page.goto("/cockpit");
    await expect(page.getByTestId("audio-io-live")).toBeVisible();
    await expect(page.getByTestId("audio-io-simulated")).toHaveCount(0);
  });

  test("globe island exposes voice state attribute", async ({ page }) => {
    await page.goto("/cockpit");
    const globe = page.getByTestId("globe-island");
    await expect(globe).toBeVisible();
    await expect(globe).toHaveAttribute("data-globe-voice-state", /^(idle|listening|thinking|speaking)$/);
  });
});
