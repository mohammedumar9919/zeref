import { test as base, expect } from "@playwright/test";

/**
 * Cockpit routes stream behind `loading.tsx` (C132). React 19.2 batches Suspense
 * reveals, so after SSR the streamed tree briefly sits in a hidden `div[id^="S:"]`
 * next to the revealed copy and strict test-id locators see two elements.
 * Wait for the reveal after every full navigation.
 */
const PENDING_REVEAL = 'div[hidden][id^="S:"]';

export const test = base.extend({
  page: async ({ page }, use) => {
    const goto = page.goto.bind(page);
    const reload = page.reload.bind(page);

    page.goto = async (...args: Parameters<typeof goto>) => {
      const response = await goto(...args);
      await expect(page.locator(PENDING_REVEAL)).toHaveCount(0);
      return response;
    };
    page.reload = async (...args: Parameters<typeof reload>) => {
      const response = await reload(...args);
      await expect(page.locator(PENDING_REVEAL)).toHaveCount(0);
      return response;
    };

    await use(page);
  },
});

export { expect };
