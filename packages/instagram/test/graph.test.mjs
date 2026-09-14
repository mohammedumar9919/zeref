import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

const testDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(testDir, "../../..");
const fixturesGraph = join(repoRoot, "fixtures/phase-2/graph");

const built = await import(pathToFileURL(join(testDir, "../dist/index.js")).href);
const {
  fetchInstagramUser,
  fetchInstagramMedia,
  fetchMediaInsights,
  fetchAccountInsights,
  fetchCompetitorDiscovery,
  mapGraphMediaItem,
  shortcodeFromPermalink,
} = built;

function loadJson(name) {
  return JSON.parse(readFileSync(join(fixturesGraph, name), "utf8"));
}

function mockFetch(routes) {
  return async (input) => {
    const url = new URL(String(input));
    const path = url.pathname.replace(/^\//, "");
    const key = path.split("?")[0];
    const body = routes[key];
    if (!body) {
      return new Response(`not found: ${key}`, { status: 404 });
    }
    return new Response(JSON.stringify(body), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  };
}

test("shortcodeFromPermalink extracts p and reel paths", () => {
  assert.equal(
    shortcodeFromPermalink("https://www.instagram.com/p/ABC123xyz/"),
    "ABC123xyz",
  );
  assert.equal(
    shortcodeFromPermalink("https://www.instagram.com/reel/DEF456uvw/"),
    "DEF456uvw",
  );
});

test("mapGraphMediaItem preserves Q2 fields", () => {
  const raw = loadJson("media-list.json").data[0];
  const mapped = mapGraphMediaItem(raw);
  assert.equal(mapped.id, raw.id);
  assert.equal(mapped.like_count, 5000);
  assert.equal(mapped.comments_count, 120);
  assert.equal(mapped.media_type, "IMAGE");
});

test("fetchInstagramUser uses mock HTTP", async () => {
  const userFixture = loadJson("user.json");
  const fetchImpl = mockFetch({
    "me": userFixture,
    [`${userFixture.id}`]: userFixture,
  });
  const user = await fetchInstagramUser({
    accessToken: "test-token",
    fetchImpl,
    baseUrl: "https://graph.test/",
  });
  assert.equal(user.id, userFixture.id);
  assert.equal(user.username, "fixture_user");
});

test("fetchInstagramMedia uses mock HTTP", async () => {
  const userFixture = loadJson("user.json");
  const mediaFixture = loadJson("media-list.json");
  const fetchImpl = mockFetch({
    "me": userFixture,
    [`${userFixture.id}/media`]: mediaFixture,
  });
  const media = await fetchInstagramMedia({
    accessToken: "test-token",
    userId: userFixture.id,
    fetchImpl,
    baseUrl: "https://graph.test/",
  });
  assert.equal(media.length, 2);
  assert.equal(media[0].permalink, "https://www.instagram.com/p/ABC123xyz/");
});

test("fetchMediaInsights maps lifetime values", async () => {
  const fetchImpl = mockFetch({
    "media-1/insights": {
      data: [
        {
          name: "reach",
          period: "lifetime",
          title: "Accounts reached",
          values: [{ value: 1189 }],
        },
        {
          name: "views",
          period: "lifetime",
          values: [{ value: 1513 }],
        },
      ],
    },
  });
  const result = await fetchMediaInsights({
    accessToken: "test-token",
    mediaId: "media-1",
    fetchImpl,
    baseUrl: "https://graph.test/",
  });
  assert.equal(result.mediaId, "media-1");
  assert.equal(result.metrics.length, 2);
  assert.equal(result.metrics[0].values?.[0]?.value, 1189);
});

test("fetchAccountInsights maps total_value metrics", async () => {
  const fetchImpl = mockFetch({
    "ig-user-1/insights": {
      data: [
        {
          name: "views",
          period: "day",
          title: "Views",
          total_value: { value: 1847 },
        },
        {
          name: "reach",
          period: "day",
          total_value: { value: 1203 },
        },
      ],
    },
  });
  const result = await fetchAccountInsights({
    accessToken: "test-token",
    userId: "ig-user-1",
    fetchImpl,
    baseUrl: "https://graph.test/",
  });
  assert.equal(result.userId, "ig-user-1");
  assert.equal(result.metrics[0].totalValue, 1847);
  assert.equal(result.metrics[1].totalValue, 1203);
});

test("fetchCompetitorDiscovery maps Facebook Graph Business Discovery fixture", async () => {
  assert.equal(typeof fetchCompetitorDiscovery, "function");
  const bdFixture = loadJson("business-discovery.json");
  const seen = [];
  const fetchImpl = async (input) => {
    const url = new URL(String(input));
    seen.push(url);
    assert.equal(url.hostname, "graph.facebook.com");
    assert.match(url.pathname, /\/v21\.0\/17841400000000001$/);
    assert.match(url.searchParams.get("fields") ?? "", /business_discovery\.username\(nasa\)/);
    assert.equal(url.searchParams.get("access_token"), "fb-test-token");
    return new Response(JSON.stringify(bdFixture), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  };

  const result = await fetchCompetitorDiscovery({
    accessToken: "fb-test-token",
    igBusinessId: "17841400000000001",
    username: "@nasa",
    mediaLimit: 2,
    fetchImpl,
  });

  assert.equal(seen.length, 1);
  assert.equal(result.username, "nasa");
  assert.equal(result.name, "NASA");
  assert.equal(result.followersCount, 96000000);
  assert.equal(result.mediaCount, 4200);
  assert.equal(result.media.length, 2);
  assert.equal(result.media[0].like_count, 88000);
  assert.equal(result.sourceHost, "graph.facebook.com");
});

test("fetchCompetitorDiscovery uses graph.facebook.com not graph.instagram.com", async () => {
  const bdFixture = loadJson("business-discovery.json");
  const fetchImpl = async (input) => {
    const url = new URL(String(input));
    assert.notEqual(url.hostname, "graph.instagram.com");
    assert.equal(url.hostname, "graph.facebook.com");
    return new Response(JSON.stringify(bdFixture), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  };
  await fetchCompetitorDiscovery({
    accessToken: "fb-test-token",
    igBusinessId: "17841400000000001",
    username: "nasa",
    fetchImpl,
  });
});

test("fetchCompetitorDiscovery redacts tokens from Meta errors", async () => {
  const fetchImpl = async () =>
    new Response(
      JSON.stringify({
        error: {
          message: "Invalid OAuth access token fb-secret-token-value",
          type: "OAuthException",
          code: 190,
        },
      }),
      { status: 400, headers: { "content-type": "application/json" } },
    );

  await assert.rejects(
    () =>
      fetchCompetitorDiscovery({
        accessToken: "fb-secret-token-value",
        igBusinessId: "17841400000000001",
        username: "nasa",
        fetchImpl,
        baseUrl: "https://graph.facebook.com/v21.0/",
      }),
    (err) => {
      assert.ok(err instanceof Error);
      assert.doesNotMatch(err.message, /fb-secret-token-value/);
      assert.match(err.message, /Invalid OAuth|190|400/);
      return true;
    },
  );
});

test("fetchCompetitorDiscovery rejects invalid competitor username", async () => {
  await assert.rejects(
    () =>
      fetchCompetitorDiscovery({
        accessToken: "fb-test-token",
        igBusinessId: "17841400000000001",
        username: "nasa{id}",
        fetchImpl: async () => {
          throw new Error("network should not be called");
        },
      }),
    /Invalid Instagram username/,
  );
});
