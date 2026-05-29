import type { GraphMediaFields, GraphUserFields } from "../types.js";

const DEFAULT_GRAPH_BASE = "https://graph.instagram.com";

export type GraphFetch = (
  input: RequestInfo | URL,
  init?: RequestInit,
) => Promise<Response>;

export type GraphClientOptions = {
  accessToken: string;
  userId?: string;
  baseUrl?: string;
  fetchImpl?: GraphFetch;
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

async function graphGet<T>(
  path: string,
  accessToken: string,
  fetchImpl: GraphFetch,
  baseUrl: string,
): Promise<T> {
  const url = new URL(path, baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`);
  url.searchParams.set("access_token", accessToken);
  const res = await fetchImpl(url);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Graph API ${res.status}: ${text.slice(0, 300)}`);
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
    );
    userId = me.id;
  }
  return graphGet<GraphUserFields>(
    `${userId}?fields=id,username`,
    options.accessToken,
    fetchImpl,
    baseUrl,
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
    );
    userId = me.id;
  }
  const limit = options.limit ?? 12;
  const mediaRes = await graphGet<GraphMediaListResponse>(
    `${userId}/media?fields=${MEDIA_FIELDS}&limit=${limit}`,
    options.accessToken,
    fetchImpl,
    baseUrl,
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
