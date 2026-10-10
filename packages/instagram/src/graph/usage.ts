/** Parsed Meta rate-limit headers (`x-app-usage`, `x-business-use-case-usage`). */
export type GraphUsage = {
  callCountPct: number;
  totalTimePct: number;
  totalCputimePct: number;
  /** Highest of the three percentages across all parsed headers/buckets. */
  maxPct: number;
  estimatedTimeToRegainAccessMin?: number;
};

export type GraphHeadersLike =
  | { get(name: string): string | null }
  | Record<string, string | undefined>;

export type GraphThrottleReason = "daily_cap" | "usage_high" | "http_429";

export class GraphThrottledError extends Error {
  readonly reason: GraphThrottleReason;
  readonly retryAfterMin?: number;
  readonly usage?: GraphUsage;

  constructor(
    reason: GraphThrottleReason,
    opts: { retryAfterMin?: number; usage?: GraphUsage; message?: string } = {},
  ) {
    super(opts.message ?? defaultThrottleMessage(reason, opts.retryAfterMin));
    this.name = "GraphThrottledError";
    this.reason = reason;
    if (opts.retryAfterMin !== undefined) this.retryAfterMin = opts.retryAfterMin;
    if (opts.usage !== undefined) this.usage = opts.usage;
  }
}

function defaultThrottleMessage(
  reason: GraphThrottleReason,
  retryAfterMin?: number,
): string {
  const retry =
    retryAfterMin !== undefined ? ` (retry after ~${retryAfterMin} min)` : "";
  switch (reason) {
    case "daily_cap":
      return "Graph API daily call budget exhausted";
    case "usage_high":
      return `Graph API usage above throttle threshold${retry}`;
    case "http_429":
      return `Graph API 429: rate limited${retry}`;
  }
}

function readHeader(headers: GraphHeadersLike | null | undefined, name: string): string | null {
  if (!headers) return null;
  if (typeof (headers as { get?: unknown }).get === "function") {
    return (headers as { get(name: string): string | null }).get(name);
  }
  const record = headers as Record<string, string | undefined>;
  const lower = name.toLowerCase();
  for (const key of Object.keys(record)) {
    if (key.toLowerCase() === lower) return record[key] ?? null;
  }
  return null;
}

function pct(value: unknown): number | null {
  const n = typeof value === "string" ? Number(value) : value;
  return typeof n === "number" && Number.isFinite(n) && n >= 0 ? n : null;
}

type UsageBucket = {
  call_count?: unknown;
  total_time?: unknown;
  total_cputime?: unknown;
  estimated_time_to_regain_access?: unknown;
};

function safeJson(raw: string | null): unknown {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/**
 * Reads Meta usage headers. Missing or malformed headers → `null`.
 * Business-use-case usage is `{ [id]: UsageBucket[] }`; the highest bucket wins.
 */
export function parseGraphUsage(
  headers: GraphHeadersLike | null | undefined,
): GraphUsage | null {
  const buckets: UsageBucket[] = [];

  const app = safeJson(readHeader(headers, "x-app-usage"));
  if (app && typeof app === "object" && !Array.isArray(app)) {
    buckets.push(app as UsageBucket);
  }

  const buc = safeJson(readHeader(headers, "x-business-use-case-usage"));
  if (buc && typeof buc === "object" && !Array.isArray(buc)) {
    for (const entries of Object.values(buc as Record<string, unknown>)) {
      if (!Array.isArray(entries)) continue;
      for (const entry of entries) {
        if (entry && typeof entry === "object") buckets.push(entry as UsageBucket);
      }
    }
  }

  let callCountPct: number | null = null;
  let totalTimePct: number | null = null;
  let totalCputimePct: number | null = null;
  let regain: number | null = null;
  for (const b of buckets) {
    const c = pct(b.call_count);
    const t = pct(b.total_time);
    const u = pct(b.total_cputime);
    const r = pct(b.estimated_time_to_regain_access);
    if (c !== null) callCountPct = Math.max(callCountPct ?? 0, c);
    if (t !== null) totalTimePct = Math.max(totalTimePct ?? 0, t);
    if (u !== null) totalCputimePct = Math.max(totalCputimePct ?? 0, u);
    if (r !== null) regain = Math.max(regain ?? 0, r);
  }

  if (callCountPct === null && totalTimePct === null && totalCputimePct === null) {
    return null;
  }

  const usage: GraphUsage = {
    callCountPct: callCountPct ?? 0,
    totalTimePct: totalTimePct ?? 0,
    totalCputimePct: totalCputimePct ?? 0,
    maxPct: Math.max(callCountPct ?? 0, totalTimePct ?? 0, totalCputimePct ?? 0),
  };
  if (regain !== null && regain > 0) usage.estimatedTimeToRegainAccessMin = regain;
  return usage;
}

/** Daily Graph call budget. `tryConsume` returns false (and consumes nothing) when over cap. */
export interface GraphBudget {
  tryConsume(n?: number): boolean;
  used(): number;
  cap(): number;
}

function utcDayKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** In-memory budget that resets at UTC midnight. Inject `now` for tests. */
export function createInMemoryDailyBudget(opts: {
  cap: number;
  now?: () => Date;
}): GraphBudget {
  const capValue = Math.max(0, Math.floor(opts.cap));
  const now = opts.now ?? (() => new Date());
  let day = utcDayKey(now());
  let usedCount = 0;

  const roll = () => {
    const today = utcDayKey(now());
    if (today !== day) {
      day = today;
      usedCount = 0;
    }
  };

  return {
    tryConsume(n = 1) {
      roll();
      const amount = Math.max(0, Math.floor(n));
      if (usedCount + amount > capValue) return false;
      usedCount += amount;
      return true;
    },
    used() {
      roll();
      return usedCount;
    },
    cap() {
      return capValue;
    },
  };
}

/** Strips `access_token=` / `input_token=` query values and any literal secrets. */
export function redactGraphSecrets(
  text: string,
  secrets: Array<string | undefined> = [],
): string {
  let out = String(text ?? "").replace(
    /(access_token|input_token)=[^&\s"'\\]+/gi,
    "$1=REDACTED",
  );
  for (const s of secrets) {
    const secret = s?.trim();
    if (secret) out = out.split(secret).join("[redacted]");
  }
  return out;
}

/** `Retry-After` (seconds or HTTP date) → whole minutes, rounded up. */
export function retryAfterMinutes(
  headers: GraphHeadersLike | null | undefined,
  now: Date = new Date(),
): number | undefined {
  const raw = readHeader(headers, "retry-after");
  if (!raw) return undefined;
  const secs = Number(raw);
  if (Number.isFinite(secs) && secs >= 0) return Math.ceil(secs / 60);
  const at = Date.parse(raw);
  if (Number.isNaN(at)) return undefined;
  return Math.max(0, Math.ceil((at - now.getTime()) / 60_000));
}
