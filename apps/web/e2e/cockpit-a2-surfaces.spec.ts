import { expect, test } from "@playwright/test";

/**
 * CLOUD-A2 — product surfaces polish (narrative reports, media, slots, cards).
 * Runs under Playwright's default ZEREF_BFF_FIXTURE=1 env.
 */
const FIXTURE_ARTIFACT_ID = "550e8400-e29b-41d4-a716-446655440000";
const FIXTURE_ENTITY_ID = "550e8400-e29b-41d4-a716-446655440001";
const FIXTURE_TOPIC_ID = "770e8400-e29b-41d4-a716-446655440001";
const FIXTURE_CALENDAR_ID = "660e8400-e29b-41d4-a716-446655440010";

test.describe("CLOUD-A2 product surfaces", () => {
  test("reports artifact is narrative + charts, not primary JSON", async ({ page }) => {
    await page.goto(`/cockpit/reports?artifact=${FIXTURE_ARTIFACT_ID}`);
    await expect(page.getByTestId("report-artifact-detail")).toBeVisible();
    await expect(page.getByTestId("report-narrative")).toBeVisible();
    await expect(page.getByTestId("report-charts")).toBeVisible();
    await expect(page.getByTestId("report-chart-engagement")).toBeVisible();
    await expect(page.getByTestId("report-chart-recommendations")).toBeVisible();
    await expect(page.getByTestId("report-chart-citations")).toBeVisible();
    await expect(page.getByTestId("report-narrative")).not.toContainText("schemaVersion");
    await expect(page.getByTestId("report-raw-json")).toBeVisible();
  });

  test("studio editor shows media preview and hook assist", async ({ page }) => {
    await page.goto(`/cockpit/studio/${FIXTURE_ENTITY_ID}`);
    await expect(page.getByTestId("studio-editor")).toBeVisible();
    await expect(page.getByTestId("studio-media-preview")).toBeVisible();
    await expect(page.getByTestId("studio-hook-assist")).toBeVisible();
  });

  test("calendar treats caption media time as first-class slot", async ({ page }) => {
    await page.goto("/cockpit/calendar");
    await expect(page.getByTestId("calendar-scheduler")).toBeVisible();
    await expect(page.getByTestId("calendar-content-slot")).toBeVisible();
    await expect(page.getByTestId("calendar-form-caption")).toBeVisible();
    await expect(page.getByTestId("calendar-form-media")).toBeVisible();
    await expect(page.getByTestId(`calendar-content-slot-${FIXTURE_CALENDAR_ID}`)).toContainText(
      "Night ride recap",
    );
    await expect(page.getByTestId("calendar-advanced-enqueue")).toBeVisible();
  });

  test("research topic renders payloadJson as cards", async ({ page }) => {
    await page.goto(`/cockpit/research/${FIXTURE_TOPIC_ID}`);
    await expect(page.getByTestId("research-topic-detail")).toBeVisible();
    await expect(page.getByTestId("research-payload-cards")).toBeVisible();
    await expect(page.getByTestId("research-payload-card-engagementScore")).toBeVisible();
    await expect(page.getByTestId("research-payload-card-insight").first()).toBeVisible();
  });
});
