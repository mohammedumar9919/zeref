import { expect, test } from "./fixtures";

/**
 * CLOUD-C6 — engagement trend chart on the reports hub (fixture data).
 *
 * Enforced when ZEREF_PHASE8_PRODUCT=1 + ZEREF_BFF_FIXTURE=1.
 */
const phase8ProductReady = process.env.ZEREF_PHASE8_PRODUCT === "1";
const bffFixtureReady = process.env.ZEREF_BFF_FIXTURE === "1";

test.describe("reports engagement trend (CLOUD-C6)", () => {
  test.beforeEach(() => {
    test.skip(
      !phase8ProductReady || !bffFixtureReady,
      "C6 — set ZEREF_PHASE8_PRODUCT=1 and ZEREF_BFF_FIXTURE=1",
    );
  });

  test("trend chart renders line, median and fixture label", async ({ page }) => {
    await page.goto("/cockpit/reports");
    const chart = page.getByTestId("report-trend-engagement");
    await expect(chart).toBeVisible();
    await expect(chart.locator("polyline")).toHaveCount(1);
    await expect(page.getByTestId("report-trend-median-line")).toHaveCount(1);
    await expect(page.getByTestId("report-trend-median")).toContainText("Your median");
    await expect(chart).toContainText("Fixture");
    await expect(page.getByTestId("report-trend-insufficient")).toHaveCount(0);
  });

  test("trend API returns the fixture series", async ({ request }) => {
    const res = await request.get("/api/v1/reports/engagement-trend");
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.source).toBe("fixture");
    expect(body.points.length).toBeGreaterThanOrEqual(3);
  });
});
