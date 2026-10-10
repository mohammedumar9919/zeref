import type { GraphMediaFields, GraphUserFields } from "../types.js";
import {
  GraphThrottledError,
  parseGraphUsage,
  redactGraphSecrets,
  retryAfterMinutes,
  type GraphBudget,
  type GraphUsage,
} from "./usage.js";

const DEFAULT_GRAPH_BASE = "https://graph.instagram.com";

export type GraphFetch = (
  input: RequestInfo | URL,
  init?: RequestInit,
) => Promise<Response>;

/**
 * Opt-in rate-limit controls. When omitted, `graphGet` behaves as before
 * (no budget, no usage-based throttling); HTTP 429 always throws `GraphThrottledError`.
 */
export type GraphGetOptions = {
  budget?: GraphBudget;
  onUsage?: (usage: GraphUsage) => void;
  /** Throw `usage_high` when parsed `maxPct` ≥ this. Default 80. */
  throttleAtPct?: number;
};

export type GraphClientOptions = {
  accessToken: string;
  userId?: string;
  baseUrl?: string;
  fetchImpl?: GraphFetch;
  graph?: GraphGetOptions;
};

type GraphMediaListResponse = {
  data?: Array<{
    id: string;
    caption?: string;
    media_type?: string;
    media_url?: string;
    permalink?: string;
    timestamp?: string;
    like_count?: number;
    comments_count?: number;
  }>;
};

type GraphUserResponse = {
  id: string;
  username?: string;
};

export async function graphGet<T>(
  path: string,
  accessToken: string,
  fetchImpl: GraphFetch,
  baseUrl: string,
  options?: GraphGetOptions,
): Promise<T> {
  if (options?.budget && !options.budget.tryConsume()) {
    throw new GraphThrottledError("daily_cap");
  }

  const url = new URL(path, baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`);
  url.searchParams.set("access_token", accessToken);

  let res: Response;
  try {
    res = await fetchImpl(url);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(
      `Graph API request failed: ${redactGraphSecrets(msg, [accessToken]).slice(0, 300)}`,
    );
  }

  const usage = parseGraphUsage(res.headers);
  if (usage && options?.onUsage) options.onUsage(usage);

  if (res.status === 429) {
    throw new GraphThrottledError("http_429", {
      retryAfterMin:
        retryAfterMinutes(res.headers) ?? usage?.estimatedTimeToRegainAccessMin,
      ...(usage ? { usage } : {}),
    });
  }
  if (!res.ok) {
    const text = await res.text();
    throw new Error(
      `Graph API ${res.status}: ${redactGraphSecrets(text, [accessToken]).slice(0, 300)}`,
    );
  }
  if (options && usage && usage.maxPct >= (options.throttleAtPct ?? 80)) {
    throw new GraphThrottledError("usage_high", {
      retryAfterMin: usage.estimatedTimeToRegainAccessMin,
      usage,
    });
  }
  return res.json() as Promise<T>;
}

/** Q2 — `GET /{ig-user-id}` (id, username). */
export async function fetchInstagramUser(
  options: GraphClientOptions,
): Promise<GraphUserFields> {
  const fetchImpl = options.fetchImpl ?? globalThis.fetch;
  const baseUrl = options.baseUrl ?? DEFAULT_GRAPH_BASE;
  let userId = options.userId;
  if (!userId) {
    const me = await graphGet<GraphUserResponse>(
      "me?fields=id,username",
      options.accessToken,
      fetchImpl,
      baseUrl,
      options.graph,
    );
    userId = me.id;
  }
  return graphGet<GraphUserFields>(
    `${userId}?fields=id,username`,
    options.accessToken,
    fetchImpl,
    baseUrl,
    options.graph,
  );
}

const MEDIA_FIELDS =
  "id,caption,media_type,media_url,permalink,timestamp,like_count,comments_count";

/** Q2 — `GET /{ig-user-id}/media` with MVP field set. */
export async function fetchInstagramMedia(
  options: GraphClientOptions & { limit?: number },
): Promise<GraphMediaFields[]> {
  const fetchImpl = options.fetchImpl ?? globalThis.fetch;
  const baseUrl = options.baseUrl ?? DEFAULT_GRAPH_BASE;
  let userId = options.userId;
  if (!userId) {
    const me = await graphGet<GraphUserResponse>(
      "me?fields=id,username",
      options.accessToken,
      fetchImpl,
      baseUrl,
      options.graph,
    );
    userId = me.id;
  }
  const limit = options.limit ?? 12;
  const mediaRes = await graphGet<GraphMediaListResponse>(
    `${userId}/media?fields=${MEDIA_FIELDS}&limit=${limit}`,
    options.accessToken,
    fetchImpl,
    baseUrl,
    options.graph,
  );
  return (mediaRes.data ?? []).map(mapGraphMediaItem);
}

type GraphMediaItemRaw = NonNullable<GraphMediaListResponse["data"]>[number];

/** Q2 — optional single media by Graph media id. */
export async function fetchInstagramMediaById(
  options: GraphClientOptions & { mediaId: string },
): Promise<GraphMediaFields> {
  const fetchImpl = options.fetchImpl ?? globalThis.fetch;
  const baseUrl = options.baseUrl ?? DEFAULT_GRAPH_BASE;
  const item = await graphGet<GraphMediaItemRaw>(
    `${options.mediaId}?fields=${MEDIA_FIELDS}`,
    options.accessToken,
    fetchImpl,
    baseUrl,
    options.graph,
  );
  return mapGraphMediaItem(item);
}

export function mapGraphMediaItem(item: {
  id: string;
  caption?: string;
  media_type?: string;
  media_url?: string;
  permalink?: string;
  timestamp?: string;
  like_count?: number;
  comments_count?: number;
}): GraphMediaFields {
  return {
    id: item.id,
    caption: item.caption,
    media_type: item.media_type,
    media_url: item.media_url,
    permalink: item.permalink,
    timestamp: item.timestamp,
    like_count: item.like_count,
    comments_count: item.comments_count,
  };
}

export function shortcodeFromPermalink(
  permalink?: string,
): string | undefined {
  if (!permalink) return undefined;
  return permalink.match(/\/(p|reel)\/([^/?#]+)/)?.[2];
}
