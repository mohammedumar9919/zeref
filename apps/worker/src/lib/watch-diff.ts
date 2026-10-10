export type PostMetrics = {
  likes?: number;
  comments?: number;
  reach?: number;
  impressions?: number;
};

const METRIC_KEYS = ["likes", "comments", "reach", "impressions"] as const;

export type SnapshotLike = {
  id: string;
  sourceRef: string;
  collectedAt: Date;
  payloadJson: unknown;
};

export type MediaRef = {
  id: string;
  timestamp?: string;
  shortcode?: string;
};

export type PostDiff = {
  sourceRef: string;
  shortcode?: string;
  /**
   * `first_seen`: only one snapshot exists. `unchanged`: this run's data matched an
   * existing snapshot (deduped by content hash). `changed`: a new snapshot was stored.
   */
  status: "first_seen" | "unchanged" | "changed";
  latestCollectedAt: string;
  previousCollectedAt: string | null;
  latest: PostMetrics;
  previous: PostMetrics | null;
  delta: PostMetrics;
};

export type WatchDiff = {
  mediaListCollectedAt: string;
  previousMediaListCollectedAt: string | null;
  media: MediaRef[];
  newPosts: MediaRef[];
  removedPosts: MediaRef[];
  posts: PostDiff[];
};

function num(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function obj(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

/** Real counts from a merged post snapshot payload; absent metrics stay absent. */
export function extractPostMetrics(payload: unknown): PostMetrics {
  const root = obj(payload) ?? {};
  const graph = obj(root.graph) ?? {};
  const scrape = obj(root.scrape) ?? {};
  const insights = obj(root.insights) ?? obj(graph.insights) ?? {};

  const out: PostMetrics = {};
  const likes = num(graph.like_count) ?? num(scrape.likes);
  const comments = num(graph.comments_count) ?? num(scrape.comments);
  const reach = num(insights.reach);
  const impressions = num(insights.impressions);
  if (likes !== undefined) out.likes = likes;
  if (comments !== undefined) out.comments = comments;
  if (reach !== undefined) out.reach = reach;
  if (impressions !== undefined) out.impressions = impressions;
  return out;
}

function shortcodeOf(sourceRef: string, payload: unknown): string | undefined {
  const fromPayload = obj(payload)?.shortcode;
  if (typeof fromPayload === "string" && fromPayload) return fromPayload;
  const match = sourceRef.match(/^instagram:post:(.+)$/);
  return match?.[1];
}

/**
 * Diff the two newest snapshots of one `sourceRef`. `newThisRun` is false when the run's
 * collect deduped onto an existing snapshot — then nothing changed and no delta is reported.
 */
export function diffSnapshotPair(
  latest: SnapshotLike,
  previous: SnapshotLike | undefined,
  opts: { newThisRun: boolean },
): PostDiff {
  const latestMetrics = extractPostMetrics(latest.payloadJson);
  const shortcode = shortcodeOf(latest.sourceRef, latest.payloadJson);
  const base = {
    sourceRef: latest.sourceRef,
    ...(shortcode ? { shortcode } : {}),
    latestCollectedAt: latest.collectedAt.toISOString(),
    latest: latestMetrics,
  };

  if (!previous) {
    return {
      ...base,
      status: opts.newThisRun ? "first_seen" : "unchanged",
      previousCollectedAt: null,
      previous: null,
      delta: {},
    };
  }

  const previousMetrics = extractPostMetrics(previous.payloadJson);
  if (!opts.newThisRun) {
    return {
      ...base,
      status: "unchanged",
      previousCollectedAt: previous.collectedAt.toISOString(),
      previous: previousMetrics,
      delta: {},
    };
  }

  const delta: PostMetrics = {};
  for (const key of METRIC_KEYS) {
    const a = latestMetrics[key];
    const b = previousMetrics[key];
    if (a !== undefined && b !== undefined) delta[key] = a - b;
  }
  return {
    ...base,
    status: "changed",
    previousCollectedAt: previous.collectedAt.toISOString(),
    previous: previousMetrics,
    delta,
  };
}

/**
 * New/removed posts between two recent-media windows. A previous post only counts as
 * removed if it is missing yet newer than the oldest post in a full current window
 * (otherwise it may simply have scrolled out of the window).
 */
export function diffMediaLists(
  current: MediaRef[],
  previous: MediaRef[] | null,
  opts: { windowFull: boolean },
): { newPosts: MediaRef[]; removedPosts: MediaRef[] } {
  if (!previous) return { newPosts: [], removedPosts: [] };

  const currentIds = new Set(current.map((m) => m.id));
  const previousIds = new Set(previous.map((m) => m.id));
  const newPosts = current.filter((m) => !previousIds.has(m.id));

  const oldestCurrent = current
    .map((m) => (m.timestamp ? Date.parse(m.timestamp) : Number.NaN))
    .filter((t) => Number.isFinite(t))
    .reduce((min, t) => Math.min(min, t), Number.POSITIVE_INFINITY);

  const removedPosts = previous.filter((m) => {
    if (currentIds.has(m.id)) return false;
    if (!opts.windowFull) return true;
    const ts = m.timestamp ? Date.parse(m.timestamp) : Number.NaN;
    return Number.isFinite(ts) && Number.isFinite(oldestCurrent) && ts >= oldestCurrent;
  });

  return { newPosts, removedPosts };
}
