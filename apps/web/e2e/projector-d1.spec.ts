import { expect, test } from "./fixtures";

/**
 * CLOUD-D1 projector polish: no developer jargon on screen, legible type at
 * 1920×1080, no horizontal scroll. Runs under Playwright's fixture env.
 */
const FIXTURE_ARTIFACT_ID = "550e8400-e29b-41d4-a716-446655440000";
const ROUTES = [
  "/cockpit",
  "/cockpit/studio",
  "/cockpit/reports",
  `/cockpit/reports?artifact=${FIXTURE_ARTIFACT_ID}`,
  "/cockpit/research",
];
const JARGON = [/Phase \d/, /ACCESS_TOKEN/, /stub telemetry/i, /VS INLINE/i, /\bRSC\b/];
const MIN_FONT_PX = 13;

test.use({ viewport: { width: 1920, height: 1080 } });

test.describe("projector polish (CLOUD-D1)", () => {
  for (const route of ROUTES) {
    test(`legible, jargon-free: ${route}`, async ({ page }) => {
      await page.goto(route);
      await expect(page.getByTestId("hud-header")).toBeVisible();

      const text = await page.locator("body").innerText();
      for (const pattern of JARGON) {
        expect(text, `jargon ${pattern} on ${route}`).not.toMatch(pattern);
      }

      const smallest = await page.evaluate(() => {
        let min = Number.POSITIVE_INFINITY;
        let sample = "";
        const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
        for (let node = walker.nextNode(); node; node = walker.nextNode()) {
          const el = node.parentElement;
          if (!el || !node.textContent?.trim()) continue;
          const rect = el.getBoundingClientRect();
          if (rect.width === 0 || rect.height === 0) continue;
          const style = getComputedStyle(el);
          if (style.visibility === "hidden" || style.display === "none") continue;
          if (el.closest("[aria-hidden='true'], .sr-only, svg")) continue;
          const size = Number.parseFloat(style.fontSize);
          if (size < min) {
            min = size;
            sample = node.textContent.trim().slice(0, 40);
          }
        }
        return { min, sample };
      });
      expect(smallest.min, `smallest text "${smallest.sample}" on ${route}`).toBeGreaterThanOrEqual(
        MIN_FONT_PX,
      );

      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - window.innerWidth,
      );
      expect(overflow, `horizontal scroll on ${route}`).toBeLessThanOrEqual(0);
    });
  }
});
