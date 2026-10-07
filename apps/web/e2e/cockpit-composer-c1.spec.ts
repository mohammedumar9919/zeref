import { expect, test, type Page, type Request } from "@playwright/test";

/**
 * CLOUD-C1 — typed HUD composer + shared ConfirmCard.
 *
 * Enforced when ZEREF_PHASE11_AGENT=1 (typed turns use the agentic
 * POST /api/v1/jarvis/run path). CI's Phase 5 step runs without that flag.
 */
const phase11AgentReady = process.env.ZEREF_PHASE11_AGENT === "1";

const JOB_RESULT_TEXT = "Job enqueued successfully.";

function jarvisRunBodies(page: Page): Array<Record<string, unknown>> {
  const bodies: Array<Record<string, unknown>> = [];
  page.on("request", (request: Request) => {
    if (request.method() === "POST" && request.url().endsWith("/api/v1/jarvis/run")) {
      bodies.push(request.postDataJSON() as Record<string, unknown>);
    }
  });
  return bodies;
}

async function sendTyped(page: Page, text: string): Promise<void> {
  const input = page.getByTestId("typed-composer-input");
  await input.fill(text);
  await input.press("Enter");
}

test.describe("cockpit typed composer (CLOUD-C1)", () => {
  test.use({ viewport: { width: 1920, height: 1080 } });

  test.beforeEach(() => {
    test.skip(
      !phase11AgentReady,
      "Set ZEREF_PHASE11_AGENT=1 to enforce cockpit-composer-c1 e2e (CLOUD-C1)",
    );
  });

  test("composer is mounted, readable, and sends on Enter", async ({ page }) => {
    await page.goto("/cockpit");
    const composer = page.getByTestId("typed-composer");
    await expect(composer).toBeVisible();

    const input = page.getByTestId("typed-composer-input");
    const fontPx = await input.evaluate((el) =>
      Number.parseFloat(getComputedStyle(el).fontSize),
    );
    expect(fontPx).toBeGreaterThanOrEqual(15);

    await expect(page.getByTestId("typed-composer-send")).toBeDisabled();

    await sendTyped(page, "show me the cockpit dashboard");

    const panel = page.getByTestId("voice-transcript-panel");
    const typedLine = panel.locator("[data-transcript-source='typed'][data-transcript-role='user']");
    await expect(typedLine).toContainText("show me the cockpit dashboard");
    await expect(typedLine.getByTestId("transcript-typed-marker")).toBeVisible();
    await expect(
      panel.locator("[data-transcript-role='assistant']").last(),
    ).toContainText(/Cockpit summary is ready/);
    await expect(input).toHaveValue("");
  });

  test("write-high stops at ConfirmCard; Cancel executes nothing, Confirm runs", async ({
    page,
  }) => {
    const bodies = jarvisRunBodies(page);
    await page.goto("/cockpit");
    const panel = page.getByTestId("voice-transcript-panel");

    await sendTyped(page, "enqueue a report job");
    const card = page.getByTestId("confirm-card");
    await expect(card).toBeVisible();
    await expect(card).toContainText(/queue a report job/i);
    await expect(card).toHaveAttribute("data-tool-name", "enqueue_job");
    await expect(panel).toContainText("Shall I queue a report job? Say yes to confirm.");
    await expect(page.getByTestId("typed-composer-input")).toBeDisabled();

    await page.getByTestId("confirm-card-cancel").click();
    await expect(card).toHaveCount(0);
    await expect(panel).toContainText("Cancelled — nothing queued.");
    await expect(panel).not.toContainText(JOB_RESULT_TEXT);
    expect(bodies.some((b) => b.confirmed === true)).toBe(false);

    await sendTyped(page, "enqueue a report job");
    await expect(card).toBeVisible();
    const pendingRunIdCount = bodies.length;

    await page.getByTestId("confirm-card-approve").click();
    await expect(card).toHaveCount(0);
    await expect(panel).toContainText(JOB_RESULT_TEXT);

    const confirmBody = bodies[pendingRunIdCount];
    expect(confirmBody?.confirmed).toBe(true);
    expect(typeof confirmBody?.runId).toBe("string");
    expect(confirmBody?.transcript).toBe("enqueue a report job");
  });

  test("server errors show friendly copy, raw error only in title", async ({ page }) => {
    await page.route("**/api/v1/jarvis/run", (route) =>
      route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ error: "raw upstream stack trace" }),
      }),
    );
    await page.goto("/cockpit");
    await sendTyped(page, "show me the cockpit dashboard");

    const error = page.getByTestId("typed-composer-error");
    await expect(error).toHaveText("Jarvis couldn't answer — try again");
    await expect(error).toHaveAttribute("title", "raw upstream stack trace");
    await expect(page.getByText("raw upstream stack trace")).toHaveCount(0);
  });
});
