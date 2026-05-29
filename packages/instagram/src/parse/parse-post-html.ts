import type { ScrapePostFields } from "../types.js";
import {
  extractPostsFromPayload,
  parseEmbeddedJson,
  parseHydrationJsonScripts,
} from "./extract-posts.js";

export type ParsePostHtmlResult = {
  posts: ScrapePostFields[];
  source: "embedded" | "hydration" | "none";
};

/** Pure parser for frozen Instagram post/profile HTML (CI-safe). */
export function parsePostHtml(html: string): ParsePostHtmlResult {
  const candidates: ScrapePostFields[] = [];

  for (const chunk of parseEmbeddedJson(html)) {
    candidates.push(...extractPostsFromPayload(chunk));
  }
  if (candidates.length > 0) {
    return { posts: candidates, source: "embedded" };
  }

  for (const chunk of parseHydrationJsonScripts(html)) {
    candidates.push(...extractPostsFromPayload(chunk));
  }
  if (candidates.length > 0) {
    return { posts: candidates, source: "hydration" };
  }

  return { posts: [], source: "none" };
}

/** Return the richest post for a target shortcode, if present in HTML. */
export function parsePostHtmlByShortcode(
  html: string,
  shortcode: string,
): ScrapePostFields | null {
  const { posts } = parsePostHtml(html);
  return posts.find((p) => p.shortcode === shortcode) ?? null;
}
