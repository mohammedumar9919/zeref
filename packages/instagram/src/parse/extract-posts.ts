import type { ScrapePostFields } from "../types.js";

function inferMediaType(
  rec: Record<string, unknown>,
): "reel" | "carousel" | "image" {
  const typename = typeof rec.__typename === "string" ? rec.__typename : "";
  const productType =
    typeof rec.product_type === "string" ? rec.product_type : "";
  const sidecar = rec.edge_sidecar_to_children as
    | { edges?: unknown[] }
    | undefined;
  if (
    rec.is_video === true ||
    typename === "GraphVideo" ||
    productType === "clips"
  ) {
    return "reel";
  }
  if (sidecar?.edges && sidecar.edges.length > 1) {
    return "carousel";
  }
  return "image";
}

function extractCarouselUrls(rec: Record<string, unknown>): string[] {
  const sidecar = rec.edge_sidecar_to_children as
    | { edges?: { node?: Record<string, unknown> }[] }
    | undefined;
  if (!sidecar?.edges) return [];
  return sidecar.edges
    .map((edge) => {
      const node = edge.node;
      if (!node) return undefined;
      return (
        (node.display_url as string | undefined) ??
        (node.thumbnail_src as string | undefined) ??
        (node.thumbnail_url as string | undefined)
      );
    })
    .filter((url): url is string => typeof url === "string" && url.length > 0);
}

export function mapPostNode(
  rec: Record<string, unknown>,
): ScrapePostFields | null {
  if (typeof rec.shortcode !== "string") return null;

  const captionNode = rec.edge_media_to_caption as
    | { edges?: { node?: { text?: string } }[] }
    | undefined;
  const caption =
    captionNode?.edges?.[0]?.node?.text ??
    (typeof rec.caption === "string" ? rec.caption : undefined) ??
    (typeof rec.accessibility_caption === "string"
      ? rec.accessibility_caption
      : undefined);

  const likes =
    (rec.edge_liked_by as { count?: number } | undefined)?.count ??
    (rec.edge_media_preview_like as { count?: number } | undefined)?.count ??
    (rec.like_count as number | undefined);
  const comments =
    (rec.edge_media_to_comment as { count?: number } | undefined)?.count ??
    (rec.comment_count as number | undefined);

  const mediaType = inferMediaType(rec);
  const permalinkPath = mediaType === "reel" ? "reel" : "p";
  const thumbnailUrl =
    (rec.display_url as string | undefined) ??
    (rec.thumbnail_src as string | undefined) ??
    (rec.thumbnail_url as string | undefined);
  const videoUrl =
    typeof rec.video_url === "string" ? rec.video_url : undefined;
  const carouselUrls = extractCarouselUrls(rec);
  const takenAt =
    typeof rec.taken_at_timestamp === "number"
      ? new Date(rec.taken_at_timestamp * 1000).toISOString()
      : undefined;

  return {
    shortcode: rec.shortcode,
    caption: caption?.slice(0, 500),
    likes,
    comments,
    url: `https://www.instagram.com/${permalinkPath}/${rec.shortcode}/`,
    mediaType,
    thumbnailUrl,
    videoUrl,
    carouselUrls: carouselUrls.length > 0 ? carouselUrls : undefined,
    postedAt: takenAt,
  };
}

export function extractPostsFromPayload(obj: unknown): ScrapePostFields[] {
  const posts: ScrapePostFields[] = [];
  const walk = (node: unknown, depth = 0): void => {
    if (depth > 12 || node === null || typeof node !== "object") return;
    if (Array.isArray(node)) {
      for (const item of node) walk(item, depth + 1);
      return;
    }
    const rec = node as Record<string, unknown>;
    const mapped = mapPostNode(rec);
    if (mapped) posts.push(mapped);
    for (const v of Object.values(rec)) walk(v, depth + 1);
  };
  walk(obj);
  const seen = new Set<string>();
  return posts.filter((p) => {
    if (seen.has(p.shortcode)) return false;
    seen.add(p.shortcode);
    return true;
  });
}

export function parseEmbeddedJson(html: string): unknown[] {
  const results: unknown[] = [];
  const patterns = [
    /window\._sharedData\s*=\s*(\{.+?\});/s,
    /"ProfilePage"\s*,\s*\[\s*\{[^]*?"user"\s*:\s*(\{[^]*?\})\s*,/s,
  ];
  for (const re of patterns) {
    const m = html.match(re);
    if (m?.[1]) {
      try {
        results.push(JSON.parse(m[1]));
      } catch {
        /* continue */
      }
    }
  }
  return results;
}

export function parseHydrationJsonScripts(html: string): unknown[] {
  const payloads: unknown[] = [];
  const re =
    /<script[^>]*type="application\/json"[^>]*>([\s\S]*?)<\/script>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const raw = m[1]?.trim() ?? "";
    if (raw.length < 32) continue;
    try {
      payloads.push(JSON.parse(raw));
    } catch {
      /* skip invalid blobs */
    }
  }
  return payloads;
}
