import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { CollectJobInput } from "@zeref/contracts";
import {
  fetchInstagramMedia,
  fetchInstagramMediaById,
  fetchInstagramUser,
  fetchPostPage,
  isLiveInstagramEnabled,
  mergeByShortcode,
  parsePostHtml,
  shortcodeFromPermalink,
  type GraphFetch,
  type GraphMediaFields,
  type MergedInstagramPostPayload,
  type ScrapePostFields,
} from "@zeref/instagram";

export type CollectPipelineDeps = {
  repoRoot?: string;
  loadScrapeHtml?: (shortcode: string) => Promise<string | null>;
  graphAccessToken?: string;
  graphUserId?: string;
  graphBaseUrl?: string;
  graphFetch?: GraphFetch;
};

function postSourceRef(shortcode: string): string {
  return `instagram:post:${shortcode}`;
}

function profileSourceRef(externalId: string): string {
  return `instagram:profile:${externalId}`;
}

async function defaultLoadScrapeHtml(
  shortcode: string,
  repoRoot: string,
): Promise<string | null> {
  const htmlDir = join(repoRoot, "fixtures/phase-2/html");
  const candidates = [
    join(htmlDir, `post-hydration-${shortcode}.html`),
    join(htmlDir, `post-hydration-${shortcode}xyz.html`),
  ];
  for (const path of candidates) {
    try {
      return await readFile(path, "utf8");
    } catch {
      // try next candidate
    }
  }
  return null;
}

async function loadScrapePosts(
  input: CollectJobInput,
  deps: CollectPipelineDeps,
): Promise<ScrapePostFields[]> {
  const shortcodes = input.shortcodes ?? [];
  const posts: ScrapePostFields[] = [];

  for (const shortcode of shortcodes) {
    if (isLiveInstagramEnabled()) {
      const url = `https://www.instagram.com/p/${shortcode}/`;
      const { posts: livePosts } = await fetchPostPage({ url });
      const match =
        livePosts.find((p: ScrapePostFields) => p.shortcode === shortcode) ??
        livePosts[0];
      if (match) posts.push(match);
      continue;
    }

    const loader =
      deps.loadScrapeHtml ??
      ((code: string) =>
        defaultLoadScrapeHtml(code, deps.repoRoot ?? process.cwd()));

    const html = await loader(shortcode);
    if (!html) {
      throw new Error(
        `scrape fixture HTML not found for shortcode ${shortcode} (set ZEREF_LIVE_INSTAGRAM=1 for live fetch)`,
      );
    }
    const { posts: parsed } = parsePostHtml(html);
    const match =
      parsed.find((p: ScrapePostFields) => p.shortcode === shortcode) ??
      parsed.find((p: ScrapePostFields) => p.shortcode.startsWith(shortcode)) ??
      parsed[0];
    if (!match) {
      throw new Error(`no scrape post parsed for shortcode ${shortcode}`);
    }
    posts.push(match);
  }

  return posts;
}

async function loadGraphMedia(
  input: CollectJobInput,
  deps: CollectPipelineDeps,
): Promise<GraphMediaFields[]> {
  const token = deps.graphAccessToken ?? process.env.INSTAGRAM_ACCESS_TOKEN;
  if (!token) {
    throw new Error(
      "graph collect requires INSTAGRAM_ACCESS_TOKEN or test graphFetch deps",
    );
  }

  const clientOptions = {
    accessToken: token,
    userId: deps.graphUserId ?? process.env.INSTAGRAM_GRAPH_USER_ID,
    baseUrl: deps.graphBaseUrl,
    fetchImpl: deps.graphFetch,
  };

  if (input.graphMediaId) {
    const item = await fetchInstagramMediaById({
      ...clientOptions,
      mediaId: input.graphMediaId,
    });
    return [item];
  }

  const media = await fetchInstagramMedia(clientOptions);
  const shortcodes = new Set(input.shortcodes ?? []);
  if (shortcodes.size === 0) return media;

  return media.filter((item: GraphMediaFields) => {
    const code = shortcodeFromPermalink(item.permalink);
    return code != null && [...shortcodes].some((s) => code === s || code.startsWith(s));
  });
}

/** Collect and merge Instagram post payloads for a job (no persistence). */
export async function collectMergedPosts(
  input: CollectJobInput,
  deps: CollectPipelineDeps = {},
): Promise<MergedInstagramPostPayload[]> {
  if (input.kind !== "instagram_post_raw") {
    throw new Error(`collectMergedPosts only supports instagram_post_raw (got ${input.kind})`);
  }

  const scrape =
    input.sources.includes("scrape")
      ? await loadScrapePosts(input, deps)
      : undefined;
  const graph = input.sources.includes("graph")
    ? await loadGraphMedia(input, deps)
    : undefined;

  const merged = mergeByShortcode({ scrape, graph });
  const shortcodes = input.shortcodes ?? [];
  if (shortcodes.length === 0) return merged;

  return merged.filter((row: MergedInstagramPostPayload) =>
    shortcodes.some(
      (s: string) => row.shortcode === s || row.shortcode.startsWith(s),
    ),
  );
}

/** Profile collect — Graph user snapshot payload. */
export async function collectProfilePayload(
  input: CollectJobInput,
  deps: CollectPipelineDeps = {},
): Promise<{ sourceRef: string; payload: unknown }> {
  if (input.kind !== "instagram_profile_raw") {
    throw new Error(`collectProfilePayload only supports instagram_profile_raw`);
  }
  if (!input.sources.includes("graph")) {
    throw new Error("instagram_profile_raw collect requires graph source");
  }

  const token = deps.graphAccessToken ?? process.env.INSTAGRAM_ACCESS_TOKEN;
  if (!token) {
    throw new Error("profile collect requires INSTAGRAM_ACCESS_TOKEN or test graphFetch");
  }

  const user = await fetchInstagramUser({
    accessToken: token,
    userId: deps.graphUserId ?? process.env.INSTAGRAM_GRAPH_USER_ID,
    baseUrl: deps.graphBaseUrl,
    fetchImpl: deps.graphFetch,
  });

  return {
    sourceRef: profileSourceRef(user.id),
    payload: { graph: user, sources: ["graph"] as const },
  };
}

export { postSourceRef, profileSourceRef };
