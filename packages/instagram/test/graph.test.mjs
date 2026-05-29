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
