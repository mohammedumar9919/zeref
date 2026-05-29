import { shortcodeFromPermalink } from "../graph/client.js";
import type {
  CollectSource,
  GraphMediaFields,
  MergedInstagramPostPayload,
  ScrapePostFields,
} from "../types.js";

function scrapeKey(post: ScrapePostFields): string {
  return post.shortcode;
}

function graphKey(item: GraphMediaFields): string | undefined {
  return shortcodeFromPermalink(item.permalink) ?? undefined;
}

function graphToScrapeShape(item: GraphMediaFields): ScrapePostFields {
  const shortcode = graphKey(item);
  const mediaType =
    item.media_type === "VIDEO"
      ? ("reel" as const)
      : item.media_type === "CAROUSEL_ALBUM"
        ? ("carousel" as const)
        : ("image" as const);
  return {
    shortcode: shortcode ?? item.id,
    caption: item.caption?.slice(0, 500),
    likes: item.like_count,
    comments: item.comments_count,
    url: item.permalink,
    mediaType,
    thumbnailUrl: item.media_url,
    postedAt: item.timestamp,
  };
}

/**
 * Merge scrape + Graph posts into one payload per shortcode (Q1).
 * Prefer Graph for counts/caption; retain scrape media URLs when present.
 */
export function mergeByShortcode(input: {
  scrape?: ScrapePostFields[];
  graph?: GraphMediaFields[];
}): MergedInstagramPostPayload[] {
  const byShortcode = new Map<string, MergedInstagramPostPayload>();

  for (const scrapePost of input.scrape ?? []) {
    const key = scrapeKey(scrapePost);
    if (!key) continue;
    const existing = byShortcode.get(key);
    const sources: CollectSource[] = existing?.sources.includes("scrape")
      ? [...existing.sources]
      : [...(existing?.sources ?? []), "scrape"];
    if (!sources.includes("scrape")) sources.push("scrape");
    byShortcode.set(key, {
      shortcode: key,
      sources,
      scrape: scrapePost,
      graph: existing?.graph,
    });
  }

  for (const graphItem of input.graph ?? []) {
    const key = graphKey(graphItem);
    if (!key) continue;
    const existing = byShortcode.get(key);
    const sources: CollectSource[] = existing?.sources.includes("graph")
      ? [...existing.sources]
      : [...(existing?.sources ?? []), "graph"];
    if (!sources.includes("graph")) sources.push("graph");

    const graphScrape = graphToScrapeShape(graphItem);
    const prevScrape = existing?.scrape;
    const mergedScrape: ScrapePostFields | undefined = prevScrape
      ? {
          ...prevScrape,
          ...graphScrape,
          thumbnailUrl: prevScrape.thumbnailUrl ?? graphScrape.thumbnailUrl,
          videoUrl: prevScrape.videoUrl ?? graphScrape.videoUrl,
          carouselUrls: prevScrape.carouselUrls ?? graphScrape.carouselUrls,
          likes: graphScrape.likes ?? prevScrape.likes,
          comments: graphScrape.comments ?? prevScrape.comments,
          caption: graphScrape.caption ?? prevScrape.caption,
          url: graphScrape.url ?? prevScrape.url,
          mediaType: graphScrape.mediaType ?? prevScrape.mediaType,
        }
      : graphScrape;

    byShortcode.set(key, {
      shortcode: key,
      sources,
      graph: graphItem,
      scrape: mergedScrape,
    });
  }

  return [...byShortcode.values()].sort((a, b) =>
    a.shortcode.localeCompare(b.shortcode),
  );
}
