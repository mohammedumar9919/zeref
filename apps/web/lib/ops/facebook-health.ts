import {
  fetchCompetitorDiscovery,
  DEFAULT_FACEBOOK_GRAPH_BASE,
  type GraphFetch,
} from "@zeref/instagram";

const DEFAULT_TIMEOUT_MS = 5_000;
const SAMPLE_USERNAME = "nasa" as const;

export type FacebookHealthResponse = {
  configured: boolean;
  reachable: boolean;
  igBusinessId?: string;
  sampleUsername?: typeof SAMPLE_USERNAME | null;
  error?: string;
  businessDiscovery: boolean;
};

export type FacebookHealthOptions = {
  accessToken?: string | null;
  igBusinessId?: string | null;
  fetchImpl?: GraphFetch;
  timeoutMs?: number;
  baseUrl?: string;
  fixtureMode?: boolean;
  sampleUsername?: typeof SAMPLE_USERNAME;
};

function readEnvToken(): string | undefined {
  const raw = process.env.FACEBOOK_ACCESS_TOKEN;
  return raw && raw.trim() ? raw.trim() : undefined;
}

function readEnvBusinessId(): string | undefined {
  const raw = process.env.FACEBOOK_IG_BUSINESS_ID;
  return raw && raw.trim() ? raw.trim() : undefined;
}

function isFixtureMode(explicit?: boolean): boolean {
  if (explicit !== undefined) return explicit;
  return process.env.ZEREF_BFF_FIXTURE === "1";
}

function shortErrorMessage(err: unknown): string {
  if (err instanceof Error) {
    const name = err.name;
    if (name === "AbortError" || name === "TimeoutError") {
      return "Facebook Graph Business Discovery timed out";
    }
    const msg = err.message.trim();
    return msg.length > 120 ? `${msg.slice(0, 117)}...` : msg || "Facebook Graph probe failed";
  }
  return "Facebook Graph probe failed";
}

/**
 * Ops probe for Facebook Graph Business Discovery token presence.
 * Always soft-fails (caller returns HTTP 200). Does not use graph.instagram.com.
 */
export async function getFacebookHealthResponse(
  options: FacebookHealthOptions = {},
): Promise<FacebookHealthResponse> {
  const token =
    options.accessToken === undefined ? readEnvToken() : options.accessToken?.trim() || undefined;
  const igBusinessId =
    options.igBusinessId === undefined
      ? readEnvBusinessId()
      : options.igBusinessId?.trim() || undefined;

  if (!token) {
    return { configured: false, reachable: false, businessDiscovery: false };
  }

  if (!igBusinessId) {
    return {
      configured: false,
      reachable: false,
      businessDiscovery: false,
      error: "FACEBOOK_IG_BUSINESS_ID missing",
    };
  }

  const sampleUsername = options.sampleUsername ?? SAMPLE_USERNAME;

  if (isFixtureMode(options.fixtureMode)) {
    return {
      configured: true,
      reachable: true,
      igBusinessId,
      sampleUsername,
      businessDiscovery: false,
      error: "ZEREF_BFF_FIXTURE=1 — skipped live graph.facebook.com probe",
    };
  }

  const fetchImpl = options.fetchImpl ?? globalThis.fetch;
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const baseUrl = options.baseUrl ?? DEFAULT_FACEBOOK_GRAPH_BASE;
  const timedFetch: GraphFetch = (input, init) =>
    fetchImpl(input, { ...init, signal: init?.signal ?? AbortSignal.timeout(timeoutMs) });

  try {
    const result = await fetchCompetitorDiscovery({
      accessToken: token,
      igBusinessId,
      username: sampleUsername,
      mediaLimit: 1,
      fetchImpl: timedFetch,
      baseUrl,
    });
    return {
      configured: true,
      reachable: true,
      igBusinessId,
      sampleUsername,
      businessDiscovery: Boolean(result.username),
    };
  } catch (err) {
    return {
      configured: true,
      reachable: false,
      igBusinessId,
      sampleUsername,
      businessDiscovery: false,
      error: shortErrorMessage(err),
    };
  }
}
