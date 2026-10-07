import { expect, test, type Page, type Request } from "@playwright/test";

/**
 * CLOUD-C2 — Reports panel "Refresh data" → Jarvis write-high confirm → collect.
 *
 * Enforced when ZEREF_PHASE11_AGENT=1. Never touches POST /api/v1/jobs/enqueue.
 */
const phase11AgentReady = process.env.ZEREF_PHASE11_AGENT === "1";

const COLLECT_RESULT_TEXT = "Collect queued — simulated in demo mode.";

function trackRequests(page: Page): { jarvis: Array<Record<string, unknown>>; enqueueRoute: number } {
  const seen = { jarvis: [] as Array<Record<string, unknown>>, enqueueRoute: 0 };
  page.on("request", (request: Request) => {
    if (request.method() !== "POST") return;
    if (request.url().endsWith("/api/v1/jarvis/run")) {
      seen.jarvis.push(request.postDataJSON() as Record<string, unknown>);
    }
    if (request.url().endsWith("/api/v1/jobs/enqueue")) seen.enqueueRoute += 1;
  });
  return seen;
}

test.describe("cockpit collect refresh (CLOUD-C2)", () => {
  test.use({ viewport: { width: 1920, height: 1080 } });

  test.beforeEach(() => {
    test.skip(
      !phase11AgentReady,
      "Set ZEREF_PHASE11_AGENT=1 to enforce cockpit-collect-c2 e2e (CLOUD-C2)",
    );
  });

  test("Refresh stops at ConfirmCard; Cancel runs nothing; Confirm shows SIMULATED result", async ({
    page,
  }) => {
    const seen = trackRequests(page);
    await page.goto("/cockpit");

    const refresh = page.getByTestId("cockpit-collect-refresh");
    await expect(refresh).toBeVisible();
    await refresh.click();

    const card = page.getByTestId("confirm-card");
    await expect(card).toBeVisible();
    await expect(card).toHaveAttribute("data-tool-name", "enqueue_job");
    await expect(card).toContainText(/collect your latest Instagram data/i);

    await page.getByTestId("confirm-card-cancel").click();
    await expect(card).toHaveCount(0);
    await expect(page.getByTestId("cockpit-collect-result")).toHaveCount(0);
    expect(seen.jarvis.some((b) => b.confirmed === true)).toBe(false);

    await refresh.click();
    await expect(card).toBeVisible();
    await page.getByTestId("confirm-card-approve").click();
    await expect(card).toHaveCount(0);

    const result = page.getByTestId("cockpit-collect-result");
    await expect(result).toContainText(COLLECT_RESULT_TEXT);
    await expect(page.getByTestId("cockpit-collect-simulated")).toBeVisible();

    const confirmed = seen.jarvis.filter((b) => b.confirmed === true);
    expect(confirmed).toHaveLength(1);
    expect(typeof confirmed[0]?.runId).toBe("string");
    expect(seen.enqueueRoute).toBe(0);
  });
});
