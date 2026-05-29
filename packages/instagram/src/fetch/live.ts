import { chromium } from "playwright";
import { parsePostHtml } from "../parse/parse-post-html.js";
import type { ScrapePostFields } from "../types.js";

export function isLiveInstagramEnabled(): boolean {
  return process.env.ZEREF_LIVE_INSTAGRAM === "1";
}

export function assertLiveInstagramEnabled(): void {
  if (!isLiveInstagramEnabled()) {
    throw new Error(
      "Live Instagram fetch requires ZEREF_LIVE_INSTAGRAM=1 (skipped in CI)",
    );
  }
}

export type FetchPostPageOptions = {
  url: string;
  timeoutMs?: number;
  headless?: boolean;
};

/** Playwright fetch of a public post URL — local/live only (Q3). */
export async function fetchPostPage(
  options: FetchPostPageOptions,
): Promise<{ html: string; posts: ScrapePostFields[]; finalUrl: string }> {
  assertLiveInstagramEnabled();
  const browser = await chromium.launch({
    headless: options.headless ?? true,
  });
  try {
    const page = await browser.newPage();
    const res = await page.goto(options.url, {
      waitUntil: "domcontentloaded",
      timeout: options.timeoutMs ?? 75_000,
    });
    if (!res?.ok()) {
      throw new Error(`HTTP ${res?.status() ?? "unknown"} for ${options.url}`);
    }
    const html = await page.content();
    const { posts } = parsePostHtml(html);
    return { html, posts, finalUrl: page.url() };
  } finally {
    await browser.close();
  }
}
