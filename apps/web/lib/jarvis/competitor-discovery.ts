import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  fetchCompetitorDiscovery,
  DEFAULT_FACEBOOK_GRAPH_BASE,
  type CompetitorDiscoveryResult,
  type GraphFetch,
} from "@zeref/instagram";

import {
  runExternalSocialResearch,
  type ExternalResearchResult,
} from "./external-research";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "../../../..");
const bdFixturePath = join(repoRoot, "fixtures/phase-2/graph/business-discovery.json");

const FACEBOOK_HINT = "set FACEBOOK_* — see LIVE_COMPETITOR_SETUP.md";

export type CompetitorToolOptions = {
  accessToken?: string | null;
  igBusinessId?: string | null;
  fetchImpl?: GraphFetch;
  fixtureMode?: boolean;
  baseUrl?: string;
};

export type DiscoverCompetitorResult = {
  available: boolean;
  source: "graph-business-discovery" | "fixture" | "unavailable";
  host: "graph.facebook.com";
  username?: string;
  profile?: CompetitorDiscoveryResult;
  message?: string;
  hint?: string;
  limitations: string[];
};

export type ReelIdea = {
  title: string;
  hook: string;
  format: string;
  why: string;
  inspiredBy?: string;
};

export type SuggestReelIdeasResult = {
  available: boolean;
  ideas: ReelIdea[];
  sources: Array<"graph-business-discovery" | "web-intel" | "fixture">;
  limitations: string[];
  query: string;
  message?: string;
  hint?: string;
};

function isFixture(explicit?: boolean): boolean {
  if (explicit !== undefined) return explicit;
  return process.env.ZEREF_BFF_FIXTURE === "1";
}

function readFacebookToken(options: CompetitorToolOptions): string | undefined {
  if (options.accessToken !== undefined) {
    const t = options.accessToken?.trim();
    return t || undefined;
  }
  const env = process.env.FACEBOOK_ACCESS_TOKEN?.trim();
  return env || undefined;
}

function readIgBusinessId(options: CompetitorToolOptions): string | undefined {
  if (options.igBusinessId !== undefined) {
    const t = options.igBusinessId?.trim();
    return t || undefined;
  }
  const env = process.env.FACEBOOK_IG_BUSINESS_ID?.trim();
  return env || undefined;
}

function coerceUsername(args: Record<string, unknown>): string {
  for (const key of ["username", "handle", "competitor", "competitorUsername"]) {
    const v = args[key];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return "";
}

function coerceQuery(args: Record<string, unknown>): string {
  for (const key of ["query", "topic", "title", "prompt", "q"]) {
    const v = args[key];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return "";
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === "string" && v.trim().length > 0).map((v) => v.trim());
}

function unavailableBd(message: string, extra?: Partial<DiscoverCompetitorResult>): DiscoverCompetitorResult {
  return {
    available: false,
    source: "unavailable",
    host: "graph.facebook.com",
    message,
    hint: FACEBOOK_HINT,
    limitations: [
      "Business Discovery requires a Facebook User token on graph.facebook.com.",
      "Instagram Login Insights (graph.instagram.com) stay separate and are unaffected.",
    ],
    ...extra,
  };
}

function mapFixtureProfile(username: string): CompetitorDiscoveryResult {
  const raw = JSON.parse(readFileSync(bdFixturePath, "utf8")) as {
    business_discovery?: {
      username?: string;
      name?: string;
      followers_count?: number;
      media_count?: number;
      biography?: string;
      website?: string;
      id?: string;
      media?: {
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
    };
    id?: string;
  };
  const node = raw.business_discovery ?? {};
  return {
    username: node.username ?? username.replace(/^@/, ""),
    name: node.name,
    followersCount: node.followers_count,
    mediaCount: node.media_count,
    biography: node.biography,
    website: node.website,
    id: node.id,
    queryingIgBusinessId: raw.id,
    media: (node.media?.data ?? []).map((item) => ({ ...item })),
    sourceHost: "graph.facebook.com",
  };
}

/** Jarvis discover_competitor — Facebook Graph Business Discovery only. */
export async function loadCompetitorDiscovery(
  args: Record<string, unknown>,
  options: CompetitorToolOptions = {},
): Promise<DiscoverCompetitorResult> {
  const username = coerceUsername(args);
  if (!username) {
    return {
      available: false,
      source: "unavailable",
      host: "graph.facebook.com",
      message:
        "username is required for discover_competitor — ask the operator for a public Instagram Business/Creator @handle.",
      hint: FACEBOOK_HINT,
      limitations: [
        "Business Discovery requires a named username on graph.facebook.com.",
        "Do not invent competitor handles.",
      ],
    };
  }

  const token = readFacebookToken(options);
  const igBusinessId = readIgBusinessId(options);
  if (!token || !igBusinessId) {
    return unavailableBd("FACEBOOK_ACCESS_TOKEN / FACEBOOK_IG_BUSINESS_ID not configured", {
      username: username.replace(/^@/, ""),
    });
  }

  const mediaLimit =
    typeof args.mediaLimit === "number" && Number.isFinite(args.mediaLimit)
      ? Math.floor(args.mediaLimit)
      : 6;

  if (isFixture(options.fixtureMode)) {
    const profile = mapFixtureProfile(username);
    return {
      available: true,
      source: "fixture",
      host: "graph.facebook.com",
      username: profile.username,
      profile,
      limitations: [
        "Fixture Business Discovery — not live graph.facebook.com.",
        "Do not treat this as a live competitor scrape.",
      ],
    };
  }

  try {
    const profile = await fetchCompetitorDiscovery({
      accessToken: token,
      igBusinessId,
      username,
      mediaLimit,
      fetchImpl: options.fetchImpl,
      baseUrl: options.baseUrl ?? DEFAULT_FACEBOOK_GRAPH_BASE,
    });
    return {
      available: true,
      source: "graph-business-discovery",
      host: "graph.facebook.com",
      username: profile.username,
      profile,
      limitations: [
        "Source is Facebook Graph Business Discovery (graph.facebook.com).",
        "Not Instagram Login Insights and not a scrape.",
      ],
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return unavailableBd(message, { username: username.replace(/^@/, "") });
  }
}

function engagement(item: { like_count?: number; comments_count?: number }): number {
  return (item.like_count ?? 0) + (item.comments_count ?? 0);
}

function ideasFromDiscovery(profile: CompetitorDiscoveryResult, limit: number): ReelIdea[] {
  return [...profile.media]
    .sort((a, b) => engagement(b) - engagement(a))
    .slice(0, limit)
    .map((item) => {
      const caption = (item.caption ?? "").trim();
      const format =
        (item.media_type ?? "").toUpperCase() === "VIDEO"
          ? "reel"
          : (item.media_type ?? "").toUpperCase() === "CAROUSEL_ALBUM"
            ? "carousel"
            : "image";
      return {
        title: caption.split("\n")[0]?.slice(0, 80) || `@${profile.username} ${format}`,
        hook: caption.slice(0, 140) || `Open on ${profile.username}'s ${format} pattern.`,
        format,
        why: `Ranked by likes+comments via graph-business-discovery (@${profile.username}).`,
        inspiredBy: profile.username,
      };
    });
}

function ideasFromWebIntel(research: ExternalResearchResult, limit: number): ReelIdea[] {
  const ideas: ReelIdea[] = [];
  for (const trend of research.trends) {
    const hooks =
      Array.isArray(trend.exampleHooks) && trend.exampleHooks.length > 0
        ? trend.exampleHooks
        : [trend.title];
    for (const hook of hooks) {
      ideas.push({
        title: trend.title,
        hook,
        format: "reel",
        why: trend.whyItMatters,
      });
      if (ideas.length >= limit) return ideas;
    }
  }
  for (const idea of research.reelIdeas ?? []) {
    if (ideas.length >= limit) break;
    ideas.push({
      title: idea.title,
      hook: idea.hook,
      format: idea.format ?? "reel",
      why: idea.why ?? research.summary,
    });
  }
  return ideas.slice(0, limit);
}

/** Jarvis suggest_reel_ideas — web-intel plus optional competitor BD. */
export async function loadReelIdeas(
  args: Record<string, unknown>,
  options: CompetitorToolOptions = {},
): Promise<SuggestReelIdeasResult> {
  const query = coerceQuery(args);
  const regions = asStringArray(args.regions);
  const platforms = asStringArray(args.platforms);
  const competitorUsernames = asStringArray(args.competitorUsernames);
  const limit =
    typeof args.limit === "number" && Number.isFinite(args.limit)
      ? Math.min(12, Math.max(1, Math.floor(args.limit)))
      : 6;

  if (!query && competitorUsernames.length === 0) {
    return {
      available: false,
      ideas: [],
      sources: [],
      query: "",
      limitations: ["query or competitorUsernames is required"],
      message: "query is required for suggest_reel_ideas when no competitors are named",
    };
  }

  const researchQuery = query || `reel ideas inspired by ${competitorUsernames.join(", ")}`;
  const research = await runExternalSocialResearch({
    query: researchQuery,
    platforms: platforms.length > 0 ? platforms : ["instagram", "facebook", "tiktok", "youtube"],
    regions: regions.length > 0 ? regions : ["united states"],
  });

  const sources: SuggestReelIdeasResult["sources"] = [];
  const ideas: ReelIdea[] = [];
  const limitations: string[] = [...(research.limitations ?? [])];

  if (research.available) {
    const webSource = research.source === "fixture" ? "fixture" : "web-intel";
    sources.push(webSource);
    ideas.push(...ideasFromWebIntel(research, limit));
  } else if (research.message) {
    limitations.push(research.message);
  }

  const token = readFacebookToken(options);
  const igBusinessId = readIgBusinessId(options);
  let hint: string | undefined;

  if (competitorUsernames.length > 0) {
    if (!token || !igBusinessId) {
      hint = FACEBOOK_HINT;
      limitations.push(
        "Competitor usernames provided but FACEBOOK_* is not configured — skipped graph-business-discovery.",
      );
    } else {
      for (const username of competitorUsernames.slice(0, 3)) {
        const discovered = await loadCompetitorDiscovery(
          { username, mediaLimit: 8 },
          options,
        );
        if (!discovered.available || !discovered.profile) {
          limitations.push(
            discovered.message ?? `Business Discovery unavailable for @${username.replace(/^@/, "")}`,
          );
          hint = discovered.hint ?? hint;
          continue;
        }
        const bdSource =
          discovered.source === "fixture" ? "fixture" : "graph-business-discovery";
        if (!sources.includes(bdSource)) sources.push(bdSource);
        ideas.push(...ideasFromDiscovery(discovered.profile, limit));
      }
    }
  }

  const deduped: ReelIdea[] = [];
  const seen = new Set<string>();
  for (const idea of ideas) {
    const key = `${idea.title}|${idea.hook}|${idea.inspiredBy ?? ""}`;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(idea);
    if (deduped.length >= limit) break;
  }

  if (deduped.length === 0) {
    return {
      available: false,
      ideas: [],
      sources,
      query: researchQuery,
      limitations:
        limitations.length > 0
          ? limitations
          : ["No reel ideas produced — configure FACEBOOK_* for competitors or OpenRouter for web-intel."],
      message: "No reel ideas produced",
      hint,
    };
  }

  return {
    available: true,
    ideas: deduped,
    sources,
    query: researchQuery,
    limitations: [
      ...limitations,
      "Sources are labeled graph-business-discovery vs web-intel/fixture — not Instagram Login Insights.",
    ],
    hint,
  };
}
