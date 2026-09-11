import { expect, test } from "@playwright/test";

/**
 * Phase 6.2 C99–C106 — Visual Tier 3 workspace HUD (ADR-035).
 *
 * `verify:phase-6.2` sets `ZEREF_PHASE62_UI=1` and chains `verify:phase-6.1`.
 *
 * Contract testids / markers:
 * - `workspace-mode` + `data-workspace-surface` on deep routes
 * - `cockpit-grid` hidden on /cockpit/studio|calendar|reports|research
 * - `top-nav` + `hud-header` unified rail (`data-unified-header`)
 * - `globe-hero` ≥58vh on /cockpit
 * - voice pulse + JARVIS sync rings honor prefers-reduced-motion
 */
const phase62UiReady = process.env.ZEREF_PHASE62_UI === "1";

const WORKSPACE_ROUTES = [
  { path: "/cockpit/studio", surface: "studio", pageTestId: "cockpit-studio-page" },
  { path: "/cockpit/calendar", surface: "calendar", pageTestId: "cockpit-calendar-page" },
  { path: "/cockpit/reports", surface: "reports", pageTestId: "cockpit-reports-page" },
  { path: "/cockpit/research", surface: "research", pageTestId: "cockpit-research-page" },
] as const;

test.describe("cockpit workspace phase 6.2 (C99–C106)", () => {
  test.beforeEach(() => {
    test.skip(
      !phase62UiReady,
      "P6.2-E — set ZEREF_PHASE62_UI=1 in verify:phase-6.2 to enforce C99–C106",
    );
  });

  test("C99 — hub cockpit still shows four-panel grid + globe", async ({
    page,
  }) => {
    await page.goto("/cockpit");
    await expect(page.getByTestId("cockpit-page")).toBeVisible();
    await expect(page.getByTestId("cockpit-grid")).toBeVisible();
    await expect(page.getByTestId("workspace-mode")).toHaveCount(0);
    await expect(page.getByTestId("panel-studio")).toBeVisible();
    await expect(page.getByTestId("panel-calendar")).toBeVisible();
    await expect(page.getByTestId("panel-reports")).toBeVisible();
    await expect(page.getByTestId("panel-research")).toBeVisible();
    await expect(page.getByTestId("globe-hero")).toBeVisible();
    await expect(page.getByTestId("globe-island")).toBeVisible();
  });

  for (const route of WORKSPACE_ROUTES) {
    test(`C99 — ${route.path} hides four-panel grid (workspace ${route.surface})`, async ({
      page,
    }) => {
      await page.goto(route.path);
      await expect(page.getByTestId(route.pageTestId)).toBeVisible();
      await expect(page.getByTestId(route.pageTestId)).toHaveClass(
        /cockpit-workspace/,
      );

      const workspace = page.getByTestId("workspace-mode");
      await expect(workspace).toBeVisible();
      await expect(workspace).toHaveAttribute(
        "data-workspace-surface",
        route.surface,
      );

      await expect(page.getByTestId("cockpit-grid")).toBeHidden();
      await expect(page.getByTestId("globe-hero")).toHaveCount(0);
    });
  }

  test("C100 — TopNav + HudHeader merge into one unified rail", async ({
    page,
  }) => {
    await page.goto("/cockpit");

    const nav = page.getByTestId("top-nav");
    const header = page.getByTestId("hud-header");
    await expect(nav).toBeVisible();
    await expect(header).toBeVisible();
    await expect(nav).toHaveAttribute("data-unified-header", "1");
    await expect(header).toHaveAttribute("data-unified-header", "1");

    await expect(nav.getByTestId("nav-cockpit")).toBeVisible();
    await expect(nav.getByTestId("nav-settings")).toBeVisible();
    await expect(header.locator(".status-chip")).toHaveCount(4);
    await expect(header.locator(".hud-header-objective")).toBeVisible();
    await expect(header.getByText("Objective")).toBeVisible();

    const navBox = await nav.boundingBox();
    const headerBox = await header.boundingBox();
    expect(navBox).toBeTruthy();
    expect(headerBox).toBeTruthy();
    if (navBox && headerBox) {
      expect(headerBox.y).toBeLessThanOrEqual(navBox.y + navBox.height + 2);
      expect(navBox.height + headerBox.height).toBeLessThanOrEqual(112);
    }
  });

  test("C101 — globe hero is at least 58vh on /cockpit", async ({ page }) => {
    await page.goto("/cockpit");
    const hero = page.getByTestId("globe-hero");
    await expect(hero).toBeVisible();

    const metrics = await hero.evaluate((el) => {
      const rect = el.getBoundingClientRect();
      const styles = getComputedStyle(el);
      return {
        height: rect.height,
        vh: window.innerHeight,
        minHeightPx: Number.parseFloat(styles.minHeight),
      };
    });

    expect(metrics.height).toBeGreaterThanOrEqual(metrics.vh * 0.58 - 1);
    expect(metrics.minHeightPx).toBeGreaterThanOrEqual(metrics.vh * 0.58 - 1);
  });

  test("C102/C103 — idle voice/brain hide pulse + sync rings", async ({
    page,
  }) => {
    await page.goto("/cockpit");
    const hero = page.getByTestId("globe-hero");
    await expect(hero).toHaveAttribute("data-globe-voice-state", "idle");
    await expect(hero).toHaveAttribute("data-globe-brain-state", "idle");
    await expect(page.getByTestId("globe-voice-pulse")).toBeHidden();
    await expect(page.getByTestId("globe-jarvis-sync")).toBeHidden();
  });

  test("C102 — voice pulse ring appears when voice state is active", async ({
    page,
  }) => {
    await page.goto("/cockpit");
    const hero = page.getByTestId("globe-hero");
    await hero.evaluate((el) => {
      el.setAttribute("data-globe-voice-state", "listening");
    });
    await expect(page.getByTestId("globe-voice-pulse")).toBeVisible();
  });

  test("C103 — JARVIS sync rings appear when brain state is not idle", async ({
    page,
  }) => {
    await page.goto("/cockpit");
    const hero = page.getByTestId("globe-hero");
    await hero.evaluate((el) => {
      el.setAttribute("data-globe-brain-state", "searching");
    });
    await expect(page.getByTestId("globe-jarvis-sync")).toBeVisible();
  });

  test("C102/C104 — pulse + sync rings honor prefers-reduced-motion", async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/cockpit");

    const hero = page.getByTestId("globe-hero");
    await hero.evaluate((el) => {
      el.setAttribute("data-globe-voice-state", "speaking");
      el.setAttribute("data-globe-brain-state", "memory_saved");
    });

    const pulse = page.getByTestId("globe-voice-pulse");
    const sync = page.getByTestId("globe-jarvis-sync");
    await expect(pulse).toBeVisible();
    await expect(sync).toBeVisible();

    const pulseAnim = await pulse.evaluate((el) => getComputedStyle(el).animationName);
    const syncAnim = await sync.evaluate((el) => getComputedStyle(el).animationName);
    expect(pulseAnim === "none" || pulseAnim === "").toBeTruthy();
    expect(syncAnim === "none" || syncAnim === "").toBeTruthy();
  });
});
