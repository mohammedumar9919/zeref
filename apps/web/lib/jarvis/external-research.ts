/**
 * External multi-platform social trend research (web-intel).
 * Not Meta Graph Insights / Business Discovery — labeled honestly for Jarvis.
 */

export type ExternalResearchResult = {
  available: boolean;
  source: "web-intel" | "fixture" | "unavailable";
  query: string;
  platforms: string[];
  regions: string[];
  lookbackDays: number;
  summary: string;
  trends: Array<{
    title: string;
    platforms: string[];
    regions?: string[];
    whyItMatters: string;
    exampleHooks?: string[];
    confidence: "low" | "medium" | "high";
  }>;
  limitations: string[];
  message?: string;
};

function asStringArray(value: unknown, fallback: string[]): string[] {
  if (!Array.isArray(value)) return fallback;
  const items = value.filter((v): v is string => typeof v === "string" && v.trim().length > 0);
  return items.length > 0 ? items : fallback;
}

function coerceQuery(args: Record<string, unknown>): string {
  for (const key of ["query", "topic", "title", "prompt", "q"]) {
    const v = args[key];
    if (typeof v === "string" && v.trim().length > 0) return v.trim();
  }
  return "";
}

function fixtureResult(query: string, platforms: string[], regions: string[], lookbackDays: number): ExternalResearchResult {
  return {
    available: true,
    source: "fixture",
    query,
    platforms,
    regions,
    lookbackDays,
    summary:
      "Fixture web-intel: moto short-form is leaning night-ride POV, exhaust note ASMR, and garage-build progress cuts.",
    trends: [
      {
        title: "Exhaust-note POV reels",
        platforms: ["instagram", "tiktok"],
        regions: ["united states"],
        whyItMatters: "High retention first 1.5s from audio identity.",
        exampleHooks: ["Wait for the downshift…", "This is what 12k rpm sounds like"],
        confidence: "medium",
      },
      {
        title: "Garage build diary carousels",
        platforms: ["instagram", "facebook"],
        regions: ["chicago", "india"],
        whyItMatters: "Saves + shares from process content beat polished ads.",
        exampleHooks: ["Day 14 of the ZX6R refresh"],
        confidence: "medium",
      },
    ],
    limitations: [
      "Fixture mode — not live web crawl.",
      "Meta Graph does not expose city-level viral discovery on Instagram Login collect tokens.",
    ],
  };
}

function parseModelJson(text: string): Partial<ExternalResearchResult> | null {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = fenced?.[1]?.trim() ?? trimmed;
  try {
    return JSON.parse(raw) as Partial<ExternalResearchResult>;
  } catch {
    return null;
  }
}

/** Research public social trends via OpenRouter (web-intel). */
export async function runExternalSocialResearch(
  args: Record<string, unknown>,
): Promise<ExternalResearchResult> {
  const query = coerceQuery(args);
  const platforms = asStringArray(args.platforms, ["instagram", "facebook", "tiktok", "youtube"]);
  const regions = asStringArray(args.regions, ["united states"]);
  const lookbackDays =
    typeof args.lookbackDays === "number" && Number.isFinite(args.lookbackDays)
      ? Math.max(1, Math.min(90, Math.floor(args.lookbackDays)))
      : 14;

  if (!query) {
    return {
      available: false,
      source: "unavailable",
      query: "",
      platforms,
      regions,
      lookbackDays,
      summary: "",
      trends: [],
      limitations: ["query is required"],
      message: "query is required for research_external_trends",
    };
  }

  if (process.env.ZEREF_BFF_FIXTURE === "1" || process.env.ZEREF_LLM_MOCK === "1") {
    return fixtureResult(query, platforms, regions, lookbackDays);
  }

  const apiKey = process.env.OPENROUTER_API_KEY?.trim();
  if (!apiKey) {
    return {
      available: false,
      source: "unavailable",
      query,
      platforms,
      regions,
      lookbackDays,
      summary: "",
      trends: [],
      limitations: ["OPENROUTER_API_KEY missing"],
      message: "OPENROUTER_API_KEY required for external research",
    };
  }

  const model =
    process.env.OPENROUTER_RESEARCH_MODEL?.trim() ||
    process.env.OPENROUTER_MODEL?.trim() ||
    "openai/gpt-4o-mini";

  const system = [
    "You are a social media trend analyst.",
    "Return ONLY valid JSON matching:",
    '{"summary":string,"trends":[{"title":string,"platforms":string[],"regions":string[],"whyItMatters":string,"exampleHooks":string[],"confidence":"low"|"medium"|"high"}]}',
    "Focus on Instagram, Facebook, TikTok, YouTube as requested.",
    "Be concrete about formats, audio/hooks, and regional angles when asked.",
    "If live platform APIs are unavailable, still give best-effort public-web style intel and keep confidence honest.",
    "Do not claim Meta Graph Insights access.",
  ].join(" ");

  const user = JSON.stringify({
    query,
    platforms,
    regions,
    lookbackDays,
    maxTrends: 8,
  });

  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://zeref.local",
        "X-Title": "Zeref external research",
      },
      body: JSON.stringify({
        model,
        temperature: 0.4,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
      signal: AbortSignal.timeout(45_000),
    });

    if (!response.ok) {
      const text = await response.text();
      return {
        available: false,
        source: "unavailable",
        query,
        platforms,
        regions,
        lookbackDays,
        summary: "",
        trends: [],
        limitations: [`OpenRouter ${response.status}`],
        message: text.slice(0, 300),
      };
    }

    const payload = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = payload.choices?.[0]?.message?.content ?? "";
    const parsed = parseModelJson(content);
    const trends = Array.isArray(parsed?.trends) ? parsed.trends : [];

    return {
      available: true,
      source: "web-intel",
      query,
      platforms,
      regions,
      lookbackDays,
      summary:
        typeof parsed?.summary === "string" && parsed.summary.trim()
          ? parsed.summary.trim()
          : content.slice(0, 600),
      trends: trends
        .filter((t): t is ExternalResearchResult["trends"][number] => Boolean(t && typeof t === "object"))
        .slice(0, 10)
        .map((t) => ({
          title: typeof t.title === "string" ? t.title : "Untitled trend",
          platforms: Array.isArray(t.platforms)
            ? t.platforms.filter((p): p is string => typeof p === "string")
            : platforms,
          regions: Array.isArray(t.regions)
            ? t.regions.filter((r): r is string => typeof r === "string")
            : regions,
          whyItMatters:
            typeof t.whyItMatters === "string" ? t.whyItMatters : "See summary.",
          exampleHooks: Array.isArray(t.exampleHooks)
            ? t.exampleHooks.filter((h): h is string => typeof h === "string")
            : undefined,
          confidence:
            t.confidence === "high" || t.confidence === "medium" || t.confidence === "low"
              ? t.confidence
              : "low",
        })),
      limitations: [
        "Source is web-intel via LLM — not Meta Graph Insights, Business Discovery, or official trending APIs.",
        "Instagram Login collect tokens cannot query city-level viral audio charts.",
        "Facebook Page Insights require a separate Page token (not configured on this path).",
        "Treat hooks/examples as directional creative prompts, not guaranteed ranking data.",
      ],
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      available: false,
      source: "unavailable",
      query,
      platforms,
      regions,
      lookbackDays,
      summary: "",
      trends: [],
      limitations: ["request failed"],
      message,
    };
  }
}
