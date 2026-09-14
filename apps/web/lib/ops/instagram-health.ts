import { probeInsightsAvailable } from "@zeref/instagram";

const DEFAULT_GRAPH_BASE = "https://graph.instagram.com";
const DEFAULT_TIMEOUT_MS = 5_000;

export type InstagramHealthResponse = {
  configured: boolean;
  reachable: boolean;
  userId?: string;
  username?: string;
  insightsAvailable?: boolean;
  insightsError?: string;
  error?: string;
};

export type InstagramHealthFetch = (
  input: RequestInfo | URL,
  init?: RequestInit,
) => Promise<Response>;

export type InstagramHealthOptions = {
  accessToken?: string | null;
  fetchImpl?: InstagramHealthFetch;
  timeoutMs?: number;
  baseUrl?: string;
};

type GraphMeResponse = {
  id?: string;
  username?: string;
  error?: { message?: string };
};

function shortErrorMessage(err: unknown): string {
  if (err instanceof Error) {
    const name = err.name;
    if (name === "AbortError" || name === "TimeoutError") {
      return "Graph /me timed out";
    }
    const msg = err.message.trim();
    return msg.length > 120 ? `${msg.slice(0, 117)}...` : msg || "Graph /me failed";
  }
  return "Graph /me failed";
}

/**
 * Ops probe for Instagram Graph token presence + /me reachability.
 * Always soft-fails (caller returns HTTP 200).
 */
export async function getInstagramHealthResponse(
  options: InstagramHealthOptions = {},
): Promise<InstagramHealthResponse> {
  const token =
    options.accessToken === undefined
      ? process.env.INSTAGRAM_ACCESS_TOKEN
      : options.accessToken;

  if (!token || String(token).trim() === "") {
    return { configured: false, reachable: false };
  }

  const fetchImpl = options.fetchImpl ?? globalThis.fetch;
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const baseUrl = (options.baseUrl ?? DEFAULT_GRAPH_BASE).replace(/\/$/, "");
  const url = new URL(`${baseUrl}/me`);
  url.searchParams.set("fields", "id,username");
  url.searchParams.set("access_token", String(token));

  try {
    const res = await fetchImpl(url, {
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!res.ok) {
      const text = (await res.text()).trim();
      const detail = text.slice(0, 80) || res.statusText || String(res.status);
      return {
        configured: true,
        reachable: false,
        error: `Graph /me HTTP ${res.status}: ${detail}`,
      };
    }

    const body = (await res.json()) as GraphMeResponse;
    if (body.error?.message) {
      return {
        configured: true,
        reachable: false,
        error: body.error.message.slice(0, 120),
      };
    }
    if (!body.id) {
      return {
        configured: true,
        reachable: false,
        error: "Graph /me missing id",
      };
    }

    return {
      configured: true,
      reachable: true,
      userId: body.id,
      username: body.username,
      ...(await (async () => {
        const probe = await probeInsightsAvailable({
          accessToken: String(token),
          userId: body.id,
          fetchImpl,
          baseUrl,
        });
        return {
          insightsAvailable: probe.available,
          insightsError: probe.available ? undefined : probe.message.slice(0, 160),
        };
      })()),
    };
  } catch (err) {
    return {
      configured: true,
      reachable: false,
      error: shortErrorMessage(err),
    };
  }
}
