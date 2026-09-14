import {
  fetchAccountInsights,
  fetchInstagramMedia,
  fetchInstagramUser,
  fetchMediaInsights,
  probeInsightsAvailable,
  type InstagramInsightMetric,
} from "@zeref/instagram";

export type InstagramAccountSnapshot = {
  available: boolean;
  source: "graph" | "fixture" | "unavailable";
  username?: string;
  userId?: string;
  mediaCount?: number;
  mediaFetched: number;
  counts: {
    total: number;
    image: number;
    video: number;
    carousel: number;
    unknown: number;
  };
  recent: Array<{
    id: string;
    mediaType?: string;
    captionPreview?: string;
    likeCount?: number;
    commentsCount?: number;
    timestamp?: string;
    permalink?: string;
    insights?: Record<string, number>;
  }>;
  accountInsights?: Record<string, number>;
  insights: {
    available: boolean;
    message: string;
    permissionHint: string;
  };
  limitations: string[];
  message?: string;
};

function metricMap(metrics: InstagramInsightMetric[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const metric of metrics) {
    if (typeof metric.totalValue === "number") {
      out[metric.name] = metric.totalValue;
      continue;
    }
    const last = metric.values?.[metric.values.length - 1];
    if (last && typeof last.value === "number") {
      out[metric.name] = last.value;
    }
  }
  return out;
}

function fixtureSnapshot(): InstagramAccountSnapshot {
  return {
    available: true,
    source: "fixture",
    username: "ride_lab_pro",
    userId: "fixture-ig-user",
    mediaCount: 3,
    mediaFetched: 3,
    counts: { total: 3, image: 1, video: 2, carousel: 0, unknown: 0 },
    recent: [
      {
        id: "fixture-media-1",
        mediaType: "VIDEO",
        captionPreview: "Night ride recap",
        likeCount: 120,
        commentsCount: 8,
        insights: { views: 900, reach: 700, total_interactions: 140 },
      },
    ],
    accountInsights: { views: 1200, reach: 800, profile_views: 40 },
    insights: {
      available: true,
      message: "Fixture Insights enabled.",
      permissionHint: "instagram_business_manage_insights",
    },
    limitations: [
      "Fixture mode — not live Graph.",
      "Business Discovery (other creators) is not available on Instagram Login.",
    ],
  };
}

/** Live Graph media + Insights snapshot for Jarvis. */
export async function loadInstagramAccountSnapshot(): Promise<InstagramAccountSnapshot> {
  if (process.env.ZEREF_BFF_FIXTURE === "1") {
    return fixtureSnapshot();
  }

  const accessToken = process.env.INSTAGRAM_ACCESS_TOKEN?.trim();
  const userId = process.env.INSTAGRAM_GRAPH_USER_ID?.trim();
  if (!accessToken) {
    return {
      available: false,
      source: "unavailable",
      mediaFetched: 0,
      counts: { total: 0, image: 0, video: 0, carousel: 0, unknown: 0 },
      recent: [],
      insights: {
        available: false,
        message: "INSTAGRAM_ACCESS_TOKEN not configured.",
        permissionHint: "instagram_business_basic + instagram_business_manage_insights",
      },
      limitations: ["Token missing"],
      message: "INSTAGRAM_ACCESS_TOKEN not configured",
    };
  }

  try {
    const [user, media] = await Promise.all([
      fetchInstagramUser({ accessToken, userId }),
      fetchInstagramMedia({ accessToken, userId, limit: 25 }),
    ]);

    const counts = { total: media.length, image: 0, video: 0, carousel: 0, unknown: 0 };
    for (const item of media) {
      const t = (item.media_type ?? "").toUpperCase();
      if (t === "IMAGE") counts.image += 1;
      else if (t === "VIDEO") counts.video += 1;
      else if (t === "CAROUSEL_ALBUM") counts.carousel += 1;
      else counts.unknown += 1;
    }

    const probe = await probeInsightsAvailable({
      accessToken,
      userId: user.id,
      mediaId: media[0]?.id,
    });

    let accountInsights: Record<string, number> | undefined;
    const recent = media.slice(0, 8).map((item) => ({
      id: item.id,
      mediaType: item.media_type,
      captionPreview: item.caption?.slice(0, 120),
      likeCount: item.like_count,
      commentsCount: item.comments_count,
      timestamp: item.timestamp,
      permalink: item.permalink,
      insights: undefined as Record<string, number> | undefined,
    }));

    if (probe.available) {
      try {
        const account = await fetchAccountInsights({ accessToken, userId: user.id });
        accountInsights = metricMap(account.metrics);
      } catch {
        // keep media-level insights even if account rollup fails
      }

      const insightTargets = recent.slice(0, 5);
      await Promise.all(
        insightTargets.map(async (row) => {
          try {
            const mediaInsights = await fetchMediaInsights({
              accessToken,
              mediaId: row.id,
            });
            row.insights = metricMap(mediaInsights.metrics);
          } catch {
            // per-media failure should not fail the whole snapshot
          }
        }),
      );
    }

    return {
      available: true,
      source: "graph",
      username: user.username,
      userId: user.id,
      mediaCount: counts.total,
      mediaFetched: media.length,
      counts,
      recent,
      accountInsights,
      insights: {
        available: probe.available,
        message: probe.message,
        permissionHint: "instagram_business_manage_insights",
      },
      limitations: [
        "Business Discovery / competitor Graph lookups are not available on Instagram Login (graph.instagram.com).",
        "Facebook Page Insights need a separate Facebook Page token — not this Instagram Login token.",
        "Market-wide viral audio charts are not a Graph Insights product; use research_external_trends for that.",
      ],
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      available: false,
      source: "unavailable",
      mediaFetched: 0,
      counts: { total: 0, image: 0, video: 0, carousel: 0, unknown: 0 },
      recent: [],
      insights: {
        available: false,
        message,
        permissionHint: "instagram_business_basic + instagram_business_manage_insights",
      },
      limitations: ["Graph request failed"],
      message,
    };
  }
}

export type InstagramInsightsToolResult = {
  available: boolean;
  source: "graph" | "fixture" | "unavailable";
  scope: "account" | "media" | "both";
  account?: Record<string, number>;
  media?: Array<{ mediaId: string; mediaType?: string; metrics: Record<string, number> }>;
  message?: string;
  limitations: string[];
};

/** Focused Insights tool for Jarvis (account + optional media ids). */
export async function loadInstagramInsights(args: Record<string, unknown>): Promise<InstagramInsightsToolResult> {
  if (process.env.ZEREF_BFF_FIXTURE === "1") {
    return {
      available: true,
      source: "fixture",
      scope: "both",
      account: { views: 1200, reach: 800, profile_views: 40 },
      media: [{ mediaId: "fixture-media-1", mediaType: "VIDEO", metrics: { views: 900, reach: 700 } }],
      limitations: ["Fixture Insights"],
    };
  }

  const accessToken = process.env.INSTAGRAM_ACCESS_TOKEN?.trim();
  const userId = process.env.INSTAGRAM_GRAPH_USER_ID?.trim();
  if (!accessToken) {
    return {
      available: false,
      source: "unavailable",
      scope: "account",
      message: "INSTAGRAM_ACCESS_TOKEN not configured",
      limitations: ["Token missing"],
    };
  }

  const mediaIds = Array.isArray(args.mediaIds)
    ? args.mediaIds.filter((id): id is string => typeof id === "string" && id.trim().length > 0).slice(0, 8)
    : [];
  const includeAccount = args.includeAccount !== false;

  try {
    const out: InstagramInsightsToolResult = {
      available: true,
      source: "graph",
      scope: mediaIds.length > 0 && includeAccount ? "both" : mediaIds.length > 0 ? "media" : "account",
      limitations: [
        "Own-account Insights only (Instagram Login).",
        "Not Business Discovery / not Facebook Page Insights.",
      ],
    };

    if (includeAccount) {
      const account = await fetchAccountInsights({ accessToken, userId });
      out.account = metricMap(account.metrics);
    }

    const ids =
      mediaIds.length > 0
        ? mediaIds
        : (
            await fetchInstagramMedia({ accessToken, userId, limit: 5 })
          ).map((m) => m.id);

    const mediaRows = await fetchInstagramMedia({ accessToken, userId, limit: 25 });
    const typeById = new Map(mediaRows.map((m) => [m.id, m.media_type]));

    out.media = [];
    for (const mediaId of ids.slice(0, 5)) {
      try {
        const insights = await fetchMediaInsights({ accessToken, mediaId });
        out.media.push({
          mediaId,
          mediaType: typeById.get(mediaId),
          metrics: metricMap(insights.metrics),
        });
      } catch (error) {
        out.media.push({
          mediaId,
          mediaType: typeById.get(mediaId),
          metrics: {},
        });
        out.message = error instanceof Error ? error.message : String(error);
      }
    }

    return out;
  } catch (error) {
    return {
      available: false,
      source: "unavailable",
      scope: "account",
      message: error instanceof Error ? error.message : String(error),
      limitations: [
        "Ensure the Meta app granted instagram_business_manage_insights and the token was re-issued after adding it.",
      ],
    };
  }
}
