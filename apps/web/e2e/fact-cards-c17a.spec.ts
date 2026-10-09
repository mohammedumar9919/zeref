import { expect, test } from "@playwright/test";

/**
 * CLOUD-C17a — fact cards appear beside the globe when Jarvis answers with a tool.
 * Enforced when ZEREF_PHASE11_AGENT=1 (typed turns use the agentic run path).
 */
const phase11AgentReady = process.env.ZEREF_PHASE11_AGENT === "1";

test.describe("fact cards (CLOUD-C17a)", () => {
  test.use({ viewport: { width: 1920, height: 1080 } });

  test.beforeEach(() => {
    test.skip(!phase11AgentReady, "Set ZEREF_PHASE11_AGENT=1 to enforce fact-cards-c17a e2e");
  });

  test("headline question shows a card with the headline and a Fixture badge", async ({ page }) => {
    await page.goto("/cockpit");
    const input = page.getByTestId("typed-composer-input");
    await input.fill("what is the latest report headline");
    await input.press("Enter");

    const card = page.getByTestId("fact-card").first();
    await expect(card).toBeVisible();
    await expect(card).toHaveAttribute("data-tool-name", "get_latest_report_headline");
    await expect(card).toContainText("Ride log post shows solid engagement vs account baseline.");
    await expect(card.getByTestId("fact-card-badge")).toHaveText(/fixture/i);

    await card.getByRole("button", { name: /close/i }).click();
    await expect(page.getByTestId("fact-card")).toHaveCount(0);
  });
});
