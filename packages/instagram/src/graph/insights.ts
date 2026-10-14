import { graphGetWithErrors, type GraphClientOptions } from "./client.js";

const DEFAULT_GRAPH_BASE = "https://graph.instagram.com";

export type InstagramInsightValue = {
  value: number;
  endTime?: string;
};

export type InstagramInsightMetric = {
  name: string;
  period: string;
  title?: string;
  description?: string;
  /** Lifetime / series style */
  values?: InstagramInsightValue[];
  /** Account day total_value style */
  totalValue?: number;
};

export type MediaInsightsResult = {
  mediaId: string;
  metrics: InstagramInsightMetric[];
};

export type AccountInsightsResult = {
  userId: string;
  period: string;
  metrics: InstagramInsightMetric[];
};

type InsightsApiResponse = {
  data?: Array<{
    name?: string;
    period?: string;
    title?: string;
    description?: string;
    values?: Array<{ value?: number; end_time?: string }>;
    total_value?: { value?: number };
  }>;
};

/** Budgeted, throttled, token-redacted GET; non-OK keeps the Meta error message. */
function insightsGet<T>(
  path: string,
  options: GraphClientOptions,
  fallbackMessage: (status: number) => string,
): Promise<T> {
  return graphGetWithErrors<T>(
    path,
    options.accessToken,
    options.fetchImpl ?? globalThis.fetch,
    options.baseUrl ?? DEFAULT_GRAPH_BASE,
    options.graph,
    (status, error) => error?.message ?? fallbackMessage(status),
  );
}

function mapMetrics(data: InsightsApiResponse["data"]): InstagramInsightMetric[] {
  return (data ?? [])
    .filter((row) => typeof row?.name === "string")
    .map((row) => ({
      name: row.name as string,
      period: row.period ?? "unknown",
      title: row.title,
      description: row.description,
      values: Array.isArray(row.values)
        ? row.values
            .filter((v) => typeof v.value === "number")
            .map((v) => ({
              value: v.value as number,
              endTime: v.end_time,
            }))
        : undefined,
      totalValue:
        typeof row.total_value?.value === "number" ? row.total_value.value : undefined,
    }));
}

/** Default media metrics that work for IMAGE / VIDEO / CAROUSEL on Instagram Login. */
export const DEFAULT_MEDIA_INSIGHT_METRICS = [
  "views",
  "reach",
  "total_interactions",
  "likes",
  "comments",
  "shares",
  "saved",
] as const;

/** Default account metrics (day + total_value) for Instagram Login. */
export const DEFAULT_ACCOUNT_INSIGHT_METRICS = [
  "views",
  "reach",
  "profile_views",
  "accounts_engaged",
  "total_interactions",
] as const;

/**
 * GET /{media-id}/insights — Instagram Login host (graph.instagram.com).
 * Requires `instagram_business_manage_insights` on the user token.
 */
export async function fetchMediaInsights(
  options: GraphClientOptions & {
    mediaId: string;
    metrics?: readonly string[];
    period?: string;
  },
): Promise<MediaInsightsResult> {
  const metrics = (options.metrics ?? DEFAULT_MEDIA_INSIGHT_METRICS).join(",");
  const period = options.period ?? "lifetime";
  const body = await insightsGet<InsightsApiResponse>(
    `${options.mediaId}/insights?metric=${encodeURIComponent(metrics)}&period=${encodeURIComponent(period)}`,
    options,
    (status) => `Graph insights ${status}`,
  );
  return {
    mediaId: options.mediaId,
    metrics: mapMetrics(body.data),
  };
}

/**
 * GET /{ig-user-id}/insights — account-level day totals (Instagram Login).
 * Requires `instagram_business_manage_insights`.
 */
export async function fetchAccountInsights(
  options: GraphClientOptions & {
    metrics?: readonly string[];
    period?: string;
    metricType?: "total_value" | "time_series";
  },
): Promise<AccountInsightsResult> {
  let userId = options.userId;
  if (!userId) {
    const me = await insightsGet<{ id?: string }>(
      "me?fields=id",
      options,
      (status) => `Graph me failed: ${status}`,
    );
    if (!me.id) throw new Error("Graph me returned no id");
    userId = me.id;
  }

  const metrics = (options.metrics ?? DEFAULT_ACCOUNT_INSIGHT_METRICS).join(",");
  const period = options.period ?? "day";
  const metricType = options.metricType ?? "total_value";
  const path =
    metricType === "total_value"
      ? `${userId}/insights?metric=${encodeURIComponent(metrics)}&period=${encodeURIComponent(period)}&metric_type=total_value`
      : `${userId}/insights?metric=${encodeURIComponent(metrics)}&period=${encodeURIComponent(period)}`;

  const body = await insightsGet<InsightsApiResponse>(
    path,
    options,
    (status) => `Graph account insights ${status}`,
  );
  return {
    userId,
    period,
    metrics: mapMetrics(body.data),
  };
}

/** Soft probe — does not throw; used by health + Jarvis snapshot. */
export async function probeInsightsAvailable(
  options: GraphClientOptions & { mediaId?: string },
): Promise<{ available: boolean; message: string }> {
  try {
    if (options.mediaId) {
      await fetchMediaInsights({
        ...options,
        mediaId: options.mediaId,
        metrics: ["reach", "views"],
      });
      return {
        available: true,
        message: "Media insights reachable (instagram_business_manage_insights).",
      };
    }
    await fetchAccountInsights({
      ...options,
      metrics: ["reach", "views"],
    });
    return {
      available: true,
      message: "Account insights reachable (instagram_business_manage_insights).",
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { available: false, message };
  }
}
