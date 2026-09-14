import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const testDir = dirname(fileURLToPath(import.meta.url));
const webRoot = join(testDir, "..");

const { getFacebookHealthResponse } = await import(
  pathToFileURL(join(webRoot, "lib/ops/facebook-health.ts")).href
);

const savedToken = process.env.FACEBOOK_ACCESS_TOKEN;
const savedIgId = process.env.FACEBOOK_IG_BUSINESS_ID;
const savedFixture = process.env.ZEREF_BFF_FIXTURE;

afterEach(() => {
  if (savedToken === undefined) {
    delete process.env.FACEBOOK_ACCESS_TOKEN;
  } else {
    process.env.FACEBOOK_ACCESS_TOKEN = savedToken;
  }
  if (savedIgId === undefined) {
    delete process.env.FACEBOOK_IG_BUSINESS_ID;
  } else {
    process.env.FACEBOOK_IG_BUSINESS_ID = savedIgId;
  }
  if (savedFixture === undefined) {
    delete process.env.ZEREF_BFF_FIXTURE;
  } else {
    process.env.ZEREF_BFF_FIXTURE = savedFixture;
  }
});

describe("facebook-health ops probe (CLOUD-B3/B4)", () => {
  it("returns configured:false when token missing", async () => {
    delete process.env.FACEBOOK_ACCESS_TOKEN;
    delete process.env.FACEBOOK_IG_BUSINESS_ID;
    const body = await getFacebookHealthResponse({ accessToken: null, igBusinessId: null });
    assert.equal(body.configured, false);
    assert.equal(body.reachable, false);
    assert.equal(body.businessDiscovery, false);
  });

  it("returns configured:false when env token empty", async () => {
    process.env.FACEBOOK_ACCESS_TOKEN = "   ";
    process.env.FACEBOOK_IG_BUSINESS_ID = "17841400000000001";
    const body = await getFacebookHealthResponse();
    assert.equal(body.configured, false);
    assert.equal(body.reachable, false);
    assert.equal(body.businessDiscovery, false);
  });

  it("returns configured:false when ig business id missing", async () => {
    const body = await getFacebookHealthResponse({
      accessToken: "fb-test-token",
      igBusinessId: null,
    });
    assert.equal(body.configured, false);
    assert.equal(body.reachable, false);
    assert.equal(body.businessDiscovery, false);
    assert.match(body.error ?? "", /FACEBOOK_IG_BUSINESS_ID/);
  });

  it("skips network in fixture mode when configured", async () => {
    let called = 0;
    const fetchImpl = async () => {
      called += 1;
      throw new Error("network should not be called");
    };
    const body = await getFacebookHealthResponse({
      accessToken: "fb-test-token",
      igBusinessId: "17841400000000001",
      fixtureMode: true,
      fetchImpl,
    });
    assert.equal(called, 0);
    assert.equal(body.configured, true);
    assert.equal(body.reachable, true);
    assert.equal(body.businessDiscovery, false);
    assert.equal(body.sampleUsername, "nasa");
    assert.equal(body.igBusinessId, "17841400000000001");
  });

  it("returns reachable:true on mocked Facebook Graph BD success", async () => {
    const fetchImpl = async (input) => {
      const url = String(input);
      assert.match(url, /graph\.facebook\.com/);
      assert.doesNotMatch(url, /graph\.instagram\.com/);
      assert.match(url, /business_discovery/);
      assert.match(url, /nasa/);
      return {
        ok: true,
        status: 200,
        async text() {
          return JSON.stringify({
            id: "17841400000000001",
            business_discovery: {
              username: "nasa",
              name: "NASA",
              followers_count: 1,
              media_count: 1,
              media: { data: [] },
            },
          });
        },
        async json() {
          return JSON.parse(await this.text());
        },
      };
    };

    const body = await getFacebookHealthResponse({
      accessToken: "fb-test-token",
      igBusinessId: "17841400000000001",
      fixtureMode: false,
      fetchImpl,
    });
    assert.equal(body.configured, true);
    assert.equal(body.reachable, true);
    assert.equal(body.businessDiscovery, true);
    assert.equal(body.sampleUsername, "nasa");
    assert.equal(body.error, undefined);
    assert.equal(typeof body.businessDiscovery, "boolean");
  });

  it("returns reachable:false with short error on mocked Graph failure", async () => {
    const fetchImpl = async () => ({
      ok: false,
      status: 400,
      async text() {
        return JSON.stringify({
          error: { message: "Invalid OAuth access token fb-secret-token-value", code: 190 },
        });
      },
    });

    const body = await getFacebookHealthResponse({
      accessToken: "fb-secret-token-value",
      igBusinessId: "17841400000000001",
      fixtureMode: false,
      fetchImpl,
    });
    assert.equal(body.configured, true);
    assert.equal(body.reachable, false);
    assert.equal(body.businessDiscovery, false);
    assert.ok(typeof body.error === "string" && body.error.length > 0);
    assert.doesNotMatch(body.error, /fb-secret-token-value/);
  });
});

const { parseCompetitorUatArgs, runCompetitorUat, summarizeCompetitorDiscovery } = await import(
  pathToFileURL(join(webRoot, "../../scripts/uat-competitor.mjs")).href
);

describe("uat-competitor (CLOUD-B4)", () => {
  it("parses --username from argv", () => {
    const args = parseCompetitorUatArgs(["node", "uat-competitor.mjs", "--username", "nasa"]);
    assert.equal(args.username, "nasa");
  });

  it("soft-fails with FACEBOOK_* hint when env missing (exit 0, no token)", async () => {
    const logs = [];
    const result = await runCompetitorUat({
      argv: ["node", "uat-competitor.mjs", "--username", "nasa"],
      env: {},
      log: (line) => logs.push(String(line)),
    });
    assert.equal(result.exitCode, 0);
    assert.equal(result.ok, false);
    assert.equal(result.available, false);
    assert.match(result.hint ?? "", /FACEBOOK_\*/);
    assert.match(result.hint ?? "", /LIVE_COMPETITOR_SETUP/);
    const dumped = JSON.stringify({ result, logs });
    assert.doesNotMatch(dumped, /access_token=/i);
    assert.doesNotMatch(dumped, /EAA[A-Za-z0-9]+/);
  });

  it("skips live Graph when ZEREF_BFF_FIXTURE=1 even if FACEBOOK_* present", async () => {
    let called = 0;
    const result = await runCompetitorUat({
      argv: ["node", "uat-competitor.mjs", "--username", "nasa"],
      env: {
        FACEBOOK_ACCESS_TOKEN: "fb-secret-token-value",
        FACEBOOK_IG_BUSINESS_ID: "17841400000000001",
        ZEREF_BFF_FIXTURE: "1",
      },
      log: () => {},
      discover: async () => {
        called += 1;
        throw new Error("network should not be called");
      },
    });
    assert.equal(called, 0);
    assert.equal(result.exitCode, 0);
    assert.equal(result.available, false);
    assert.match(result.message ?? "", /ZEREF_BFF_FIXTURE/);
  });

  it("prints redacted summary on mocked BD success", async () => {
    const logs = [];
    const result = await runCompetitorUat({
      argv: ["node", "uat-competitor.mjs", "--username", "nasa"],
      env: {
        FACEBOOK_ACCESS_TOKEN: "fb-secret-token-value",
        FACEBOOK_IG_BUSINESS_ID: "17841400000000001",
      },
      log: (line) => logs.push(String(line)),
      discover: async () => ({
        username: "nasa",
        name: "NASA",
        followersCount: 96000000,
        mediaCount: 4200,
        sourceHost: "graph.facebook.com",
        media: [
          { id: "18000000000000901", like_count: 88000, comments_count: 2100, media_type: "VIDEO" },
          { id: "18000000000000902", like_count: 12000, comments_count: 400, media_type: "IMAGE" },
        ],
      }),
    });
    assert.equal(result.exitCode, 0);
    assert.equal(result.ok, true);
    assert.equal(result.summary.username, "nasa");
    assert.equal(result.summary.followersCount, 96000000);
    assert.equal(result.summary.mediaCount, 4200);
    assert.equal(result.summary.topLikes[0].likes, 88000);
    const dumped = JSON.stringify({ result, logs });
    assert.doesNotMatch(dumped, /fb-secret-token-value/);
    assert.doesNotMatch(dumped, /access_token=/i);
  });

  it("redacts token from mocked Graph errors", async () => {
    const logs = [];
    const result = await runCompetitorUat({
      argv: ["node", "uat-competitor.mjs", "--username", "nasa"],
      env: {
        FACEBOOK_ACCESS_TOKEN: "fb-secret-token-value",
        FACEBOOK_IG_BUSINESS_ID: "17841400000000001",
      },
      log: (line) => logs.push(String(line)),
      discover: async () => {
        throw new Error("Invalid OAuth access token fb-secret-token-value");
      },
    });
    assert.equal(result.ok, false);
    assert.equal(result.exitCode, 1);
    assert.doesNotMatch(result.error ?? "", /fb-secret-token-value/);
    assert.doesNotMatch(JSON.stringify(logs), /fb-secret-token-value/);
  });

  it("ranks top likes without echoing media URLs in the summary", () => {
    const summary = summarizeCompetitorDiscovery(
      {
        username: "nasa",
        followersCount: 10,
        mediaCount: 2,
        sourceHost: "graph.facebook.com",
        media: [
          {
            id: "a",
            like_count: 5,
            comments_count: 1,
            media_url: "https://cdn.example.test/secret.mp4",
          },
          { id: "b", like_count: 50, comments_count: 2 },
        ],
      },
      { topN: 2 },
    );
    assert.equal(summary.topLikes[0].id, "b");
    assert.equal(summary.topLikes[0].likes, 50);
    assert.equal(JSON.stringify(summary).includes("cdn.example.test"), false);
  });
});
