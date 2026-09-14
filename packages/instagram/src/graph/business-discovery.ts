import type { GraphMediaFields } from "../types.js";
import { mapGraphMediaItem, type GraphFetch } from "./client.js";

/** Facebook Graph host for Business Discovery — not graph.instagram.com. */
export const DEFAULT_FACEBOOK_GRAPH_BASE = "https://graph.facebook.com/v21.0";

const MEDIA_FIELDS =
  "id,caption,media_type,media_url,permalink,timestamp,like_count,comments_count";

const DEFAULT_MEDIA_LIMIT = 6;
const MAX_MEDIA_LIMIT = 12;

export type FacebookGraphClientOptions = {
  accessToken: string;
  igBusinessId: string;
  baseUrl?: string;
  fetchImpl?: GraphFetch;
};

export type CompetitorDiscoveryRequest = FacebookGraphClientOptions & {
  username: string;
  mediaLimit?: number;
};

export type CompetitorDiscoveryResult = {
  username: string;
  name?: string;
  followersCount?: number;
  mediaCount?: number;
  biography?: string;
  website?: string;
  id?: string;
  queryingIgBusinessId?: string;
  media: GraphMediaFields[];
  sourceHost: "graph.facebook.com";
};

type BusinessDiscoveryMediaRaw = {
  id: string;
  caption?: string;
  media_type?: string;
  media_url?: string;
  permalink?: string;
  timestamp?: string;
  like_count?: number;
  comments_count?: number;
};

type BusinessDiscoveryNode = {
  id?: string;
  username?: string;
  name?: string;
  followers_count?: number;
  media_count?: number;
  biography?: string;
  website?: string;
  media?: { data?: BusinessDiscoveryMediaRaw[] };
};

type FacebookGraphErrorBody = {
  error?: { message?: string; type?: string; code?: number };
  business_discovery?: BusinessDiscoveryNode;
  id?: string;
};

function sanitizeUsername(raw: string): string {
  const stripped = String(raw ?? "")
    .trim()
    .replace(/^@+/, "");
  if (!/^[A-Za-z0-9._]{1,30}$/.test(stripped)) {
    throw new Error("Invalid Instagram username for Business Discovery");
  }
  return stripped;
}

function clampMediaLimit(limit: number | undefined): number {
  const n = typeof limit === "number" && Number.isFinite(limit) ? Math.floor(limit) : DEFAULT_MEDIA_LIMIT;
  return Math.min(MAX_MEDIA_LIMIT, Math.max(1, n));
}

export function redactFacebookSecrets(text: string, token?: string): string {
  let out = String(text ?? "").replace(/access_token=[^&\s"'\\]+/gi, "access_token=REDACTED");
  const secret = token?.trim();
  if (secret && secret.length > 0) {
    out = out.split(secret).join("[redacted]");
  }
  return out.slice(0, 300);
}

function bdFields(username: string, mediaLimit: number): string {
  return `business_discovery.username(${username}){username,name,followers_count,media_count,biography,website,media.limit(${mediaLimit}){${MEDIA_FIELDS}}}`;
}

function hostnameOf(baseUrl: string): string {
  try {
    return new URL(baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`).hostname;
  } catch {
    return "graph.facebook.com";
  }
}

/**
 * GET /{ig-business-id}?fields=business_discovery.username(...) on graph.facebook.com.
 * Requires a Facebook User token + Page-linked IG business id. Not Instagram Login.
 */
export async function fetchCompetitorDiscovery(
  options: CompetitorDiscoveryRequest,
): Promise<CompetitorDiscoveryResult> {
  const username = sanitizeUsername(options.username);
  const mediaLimit = clampMediaLimit(options.mediaLimit);
  const fetchImpl = options.fetchImpl ?? globalThis.fetch;
  const baseUrl = options.baseUrl ?? DEFAULT_FACEBOOK_GRAPH_BASE;
  const igBusinessId = String(options.igBusinessId ?? "").trim();
  if (!igBusinessId) {
    throw new Error("FACEBOOK_IG_BUSINESS_ID is required for Business Discovery");
  }
  if (!options.accessToken?.trim()) {
    throw new Error("FACEBOOK_ACCESS_TOKEN is required for Business Discovery");
  }

  const url = new URL(
    igBusinessId,
    baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`,
  );
  url.searchParams.set("fields", bdFields(username, mediaLimit));
  url.searchParams.set("access_token", options.accessToken);

  const res = await fetchImpl(url);
  const rawText = await res.text();
  let body: FacebookGraphErrorBody = {};
  try {
    body = JSON.parse(rawText) as FacebookGraphErrorBody;
  } catch {
    throw new Error(
      redactFacebookSecrets(
        `Facebook Graph ${res.status}: ${rawText.slice(0, 200)}`,
        options.accessToken,
      ),
    );
  }

  if (!res.ok || body.error) {
    const message =
      body.error?.message ??
      `Facebook Graph Business Discovery failed (${res.status})`;
    throw new Error(redactFacebookSecrets(message, options.accessToken));
  }

  const node = body.business_discovery;
  if (!node || typeof node.username !== "string" || node.username.length === 0) {
    throw new Error("Facebook Graph Business Discovery returned no profile");
  }

  const host = hostnameOf(baseUrl);
  if (host !== "graph.facebook.com") {
    throw new Error("Business Discovery must use graph.facebook.com (not graph.instagram.com)");
  }

  return {
    username: node.username,
    name: node.name,
    followersCount: node.followers_count,
    mediaCount: node.media_count,
    biography: node.biography,
    website: node.website,
    id: node.id,
    queryingIgBusinessId: body.id ?? igBusinessId,
    media: (node.media?.data ?? []).map(mapGraphMediaItem),
    sourceHost: "graph.facebook.com",
  };
}
