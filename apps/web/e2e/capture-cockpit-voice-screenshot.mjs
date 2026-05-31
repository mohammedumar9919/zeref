import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = fileURLToPath(new URL("../../../", import.meta.url));
const screenshotPath = join(
  repoRoot,
  "docs/design/reference/screenshots/zeref-cockpit-6-d.png",
);
const port = process.env.PLAYWRIGHT_PORT ?? "3099";

mkdirSync(dirname(screenshotPath), { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
await page.goto(`http://127.0.0.1:${port}/cockpit`, { waitUntil: "domcontentloaded" });
await page.getByTestId("globe-canvas").waitFor({ timeout: 20_000 });
await page.getByTestId("ptt-button").waitFor({ timeout: 10_000 });
await page.getByTestId("audio-io-live").waitFor({ timeout: 10_000 });
await page.waitForTimeout(1500);
await page.screenshot({ path: screenshotPath, fullPage: true });
await browser.close();

console.log(`Screenshot saved: ${screenshotPath}`);
