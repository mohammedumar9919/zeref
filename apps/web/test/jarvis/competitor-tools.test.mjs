import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const testDir = dirname(fileURLToPath(import.meta.url));
const webRoot = join(testDir, "../..");

const { loadCompetitorDiscovery, loadReelIdeas } = await import(
  pathToFileURL(join(webRoot, "lib/jarvis/competitor-discovery.ts")).href
);
const { runExternalSocialResearch } = await import(
  pathToFileURL(join(webRoot, "lib/jarvis/external-research.ts")).href
);
const { createJarvisLlmPort } = await import(
  pathToFileURL(join(webRoot, "lib/jarvis/llm-port.ts")).href
);

const savedFbToken = process.env.FACEBOOK_ACCESS_TOKEN;
const savedFbIg = process.env.FACEBOOK_IG_BUSINESS_ID;
const savedFixture = process.env.ZEREF_BFF_FIXTURE;
const savedLlmMock = process.env.ZEREF_LLM_MOCK;

afterEach(() => {
  if (savedFbToken === undefined) delete process.env.FACEBOOK_ACCESS_TOKEN;
  else process.env.FACEBOOK_ACCESS_TOKEN = savedFbToken;
  if (savedFbIg === undefined) delete process.env.FACEBOOK_IG_BUSINESS_ID;
  else process.env.FACEBOOK_IG_BUSINESS_ID = savedFbIg;
  if (savedFixture === undefined) delete process.env.ZEREF_BFF_FIXTURE;
  else process.env.ZEREF_BFF_FIXTURE = savedFixture;
  if (savedLlmMock === undefined) delete process.env.ZEREF_LLM_MOCK;
  else process.env.ZEREF_LLM_MOCK = savedLlmMock;
});

const TOOLS = [
  { name: "discover_competitor", description: "", riskTier: "read", inputSchema: {}, idempotent: true, costHint: "cheap" },
  { name: "suggest_reel_ideas", description: "", riskTier: "write-low", inputSchema: {}, idempotent: true, costHint: "moderate" },
  { name: "research_external_trends", description: "", riskTier: "write-low", inputSchema: {}, idempotent: true, costHint: "moderate" },
  { name: "get_research_outliers", description: "", riskTier: "read", inputSchema: {}, idempotent: true, costHint: "cheap" },
  { name: "get_instagram_insights", description: "", riskTier: "read", inputSchema: {}, idempotent: true, costHint: "cheap" },
];

describe("CLOUD-B3 competitor Jarvis helpers", () => {
  it("discover_competitor returns FACEBOOK_* hint when env missing", async () => {
    delete process.env.FACEBOOK_ACCESS_TOKEN;
    delete process.env.FACEBOOK_IG_BUSINESS_ID;
    const result = await loadCompetitorDiscovery({ username: "nasa" }, { accessToken: null, igBusinessId: null });
    assert.equal(result.available, false);
    assert.equal(result.host, "graph.facebook.com");
    assert.equal(result.hint, "set FACEBOOK_* — see LIVE_COMPETITOR_SETUP.md");
  });

  it("discover_competitor maps mocked Facebook Graph payload", async () => {
    const fetchImpl = async (input) => {
      const url = String(input);
      assert.match(url, /graph\.facebook\.com/);
      assert.doesNotMatch(url, /graph\.instagram\.com/);
      return {
        ok: true,
        status: 200,
        async text() {
          return JSON.stringify({
            id: "17841400000000001",
            business_discovery: {
              username: "nasa",
              name: "NASA",
              followers_count: 10,
              media_count: 2,
              media: {
                data: [
                  {
                    id: "m1",
                    caption: "Night launch",
                    media_type: "VIDEO",
                    like_count: 50,
                    comments_count: 2,
                  },
                ],
              },
            },
          });
        },
      };
    };

    const result = await loadCompetitorDiscovery(
      { username: "@nasa" },
      {
        accessToken: "fb-test-token",
        igBusinessId: "17841400000000001",
        fixtureMode: false,
        fetchImpl,
      },
    );
    assert.equal(result.available, true);
    assert.equal(result.source, "graph-business-discovery");
    assert.equal(result.profile.username, "nasa");
    assert.equal(result.profile.media.length, 1);
  });

  it("suggest_reel_ideas labels web-intel and skips BD when FACEBOOK_* missing", async () => {
    process.env.ZEREF_BFF_FIXTURE = "1";
    const result = await loadReelIdeas(
      { query: "what reels should I make", competitorUsernames: ["nasa"] },
      { accessToken: null, igBusinessId: null, fixtureMode: true },
    );
    assert.equal(result.available, true);
    assert.ok(result.ideas.length > 0);
    assert.ok(result.sources.includes("fixture") || result.sources.includes("web-intel"));
    assert.ok(!result.sources.includes("graph-business-discovery"));
    assert.equal(result.hint, "set FACEBOOK_* — see LIVE_COMPETITOR_SETUP.md");
  });

  it("research_external_trends always includes platforms, regions, and reelIdeas", async () => {
    process.env.ZEREF_BFF_FIXTURE = "1";
    const result = await runExternalSocialResearch({ query: "moto reels" });
    assert.equal(result.available, true);
    assert.ok(Array.isArray(result.platforms) && result.platforms.length > 0);
    assert.ok(Array.isArray(result.regions) && result.regions.length > 0);
    assert.ok(Array.isArray(result.reelIdeas) && result.reelIdeas.length > 0);
  });

  it("mock LLM routes named competitor to discover_competitor not outliers", async () => {
    process.env.ZEREF_LLM_MOCK = "1";
    delete process.env.OPENROUTER_API_KEY;
    const port = createJarvisLlmPort();
    const result = await port.predict({
      messages: [{ role: "user", content: "Research competitor @nasa" }],
      tools: TOOLS,
    });
    assert.equal(result.toolCall?.name, "discover_competitor");
    assert.equal(result.toolCall?.args?.username, "nasa");
  });

  it("mock LLM routes viral reel asks to suggest_reel_ideas not outliers", async () => {
    process.env.ZEREF_LLM_MOCK = "1";
    delete process.env.OPENROUTER_API_KEY;
    const port = createJarvisLlmPort();
    const result = await port.predict({
      messages: [{ role: "user", content: "What Reels should I make for viral market trends?" }],
      tools: TOOLS,
    });
    assert.equal(result.toolCall?.name, "suggest_reel_ideas");
    assert.notEqual(result.toolCall?.name, "get_research_outliers");
  });
});
