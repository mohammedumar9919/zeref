import type { Locator } from "@playwright/test";

import { expect, test } from "./fixtures";

/**
 * C17b — motion system: tokens, route template, panel entry, reduced motion.
 * Fixture BFF only (playwright.config defaults ZEREF_BFF_FIXTURE=1).
 */

/** Max seconds across a computed comma-separated CSS time list ("0.2s, 1e-05s"). */
function maxSeconds(value: string): number {
  return Math.max(
    ...value.split(",").map((part) => {
      const v = part.trim();
      return v.endsWith("ms") ? Number.parseFloat(v) / 1000 : Number.parseFloat(v);
    }),
  );
}

async function motionStyle(locator: Locator) {
  return locator.evaluate((el) => {
    const cs = getComputedStyle(el);
    return {
      animationName: cs.animationName,
      animationDuration: cs.animationDuration,
      transitionDuration: cs.transitionDuration,
      transform: cs.transform,
    };
  });
}

async function waitForAnimationsToFinish(locator: Locator): Promise<void> {
  await expect
    .poll(() => locator.evaluate((el) => el.getAnimations().length))
    .toBe(0);
}

test.describe("C17b motion system", () => {
  test("route template + panels use entry tokens and leave no resting transform", async ({
    page,
  }) => {
    await page.goto("/cockpit");

    const route = page.getByTestId("route-transition");
    const panel = page.getByTestId("panel-studio");
    await expect(route).toHaveCount(1);
    await expect(panel).toBeVisible();

    const routeStyle = await motionStyle(route);
    expect(routeStyle.animationName).toBe("slide-up-in");
    expect(maxSeconds(routeStyle.animationDuration)).toBeCloseTo(0.32, 2);

    const panelStyle = await motionStyle(panel);
    expect(panelStyle.animationName).toBe("scale-in");
    expect(maxSeconds(panelStyle.animationDuration)).toBeCloseTo(0.2, 2);

    await waitForAnimationsToFinish(route);
    await waitForAnimationsToFinish(panel);
    expect((await motionStyle(route)).transform).toBe("none");
    expect((await motionStyle(panel)).transform).toBe("none");
  });

  test("prefers-reduced-motion collapses animation + transition durations to ~0", async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/cockpit");

    const panel = page.getByTestId("panel-studio");
    await expect(panel).toBeVisible();

    const panelStyle = await motionStyle(panel);
    expect(maxSeconds(panelStyle.animationDuration)).toBeLessThan(0.001);
    expect(maxSeconds(panelStyle.transitionDuration)).toBeLessThan(0.001);

    const routeStyle = await motionStyle(page.getByTestId("route-transition"));
    expect(maxSeconds(routeStyle.animationDuration)).toBeLessThan(0.001);

    const navLink = page.getByTestId("nav-cockpit");
    const navStyle = await motionStyle(navLink);
    expect(maxSeconds(navStyle.transitionDuration)).toBeLessThan(0.001);

    const token = await page.evaluate(() =>
      getComputedStyle(document.documentElement).getPropertyValue("--motion-duration-base").trim(),
    );
    expect(token).toBe("0.01ms");
  });

  test("navigation between cockpit routes still works with motion on", async ({ page }) => {
    await page.goto("/cockpit");
    await expect(page.getByTestId("cockpit-page")).toBeVisible();

    await page.getByTestId("panel-studio").getByRole("link", { name: /open studio/i }).click();
    await expect(page).toHaveURL(/\/cockpit\/studio$/);
    await expect(page.getByTestId("cockpit-studio-page")).toBeVisible();
    await expect(page.getByTestId("route-transition")).toHaveCount(1);

    await page.getByTestId("nav-cockpit").click();
    await expect(page).toHaveURL(/\/cockpit$/);
    await expect(page.getByTestId("cockpit-page")).toBeVisible();
    await expect(page.getByTestId("route-transition")).toHaveCount(1);
  });

  test("navigation between cockpit routes still works with reduced motion", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/cockpit");

    await page.getByTestId("panel-reports").getByRole("link", { name: /all reports/i }).click();
    await expect(page).toHaveURL(/\/cockpit\/reports$/);
    await expect(page.getByTestId("cockpit-reports-page")).toBeVisible();

    await page.getByTestId("nav-cockpit").click();
    await expect(page.getByTestId("cockpit-page")).toBeVisible();
  });
});
