import type { GraphFetch } from "./client.js";
import { redactGraphSecrets } from "./usage.js";

const DEFAULT_DEBUG_TOKEN_BASE = "https://graph.facebook.com/v21.0";

export type DebugTokenExpiryOptions = {
  appToken: string;
  inputToken: string;
  fetchImpl?: GraphFetch;
  baseUrl?: string;
};

export type DebugTokenExpiryResult = {
  /** `null` when Meta reports no expiry (`expires_at: 0`) or omits it. */
  expiresAt: Date | null;
  isValid: boolean;
};

type DebugTokenBody = {
  data?: { is_valid?: boolean; expires_at?: number };
  error?: { message?: string; code?: number };
};

/** `GET /debug_token?input_token=…` — reports token validity and expiry. Never logs tokens. */
export async function debugTokenExpiry(
  options: DebugTokenExpiryOptions,
): Promise<DebugTokenExpiryResult> {
  const fetchImpl = options.fetchImpl ?? globalThis.fetch;
  const baseUrl = options.baseUrl ?? DEFAULT_DEBUG_TOKEN_BASE;
  const secrets = [options.appToken, options.inputToken];
  const redact = (text: string) => redactGraphSecrets(text, secrets).slice(0, 300);

  const url = new URL("debug_token", baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`);
  url.searchParams.set("input_token", options.inputToken);
  url.searchParams.set("access_token", options.appToken);

  let res: Response;
  try {
    res = await fetchImpl(url);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`Graph debug_token request failed: ${redact(msg)}`);
  }

  const rawText = await res.text();
  let body: DebugTokenBody;
  try {
    body = JSON.parse(rawText) as DebugTokenBody;
  } catch {
    throw new Error(redact(`Graph debug_token ${res.status}: ${rawText}`));
  }
  if (!res.ok || body.error) {
    const message = body.error?.message ?? "request failed";
    throw new Error(redact(`Graph debug_token ${res.status}: ${message}`));
  }

  const expiresAtSec = body.data?.expires_at;
  return {
    expiresAt:
      typeof expiresAtSec === "number" && expiresAtSec > 0
        ? new Date(expiresAtSec * 1000)
        : null,
    isValid: body.data?.is_valid === true,
  };
}
