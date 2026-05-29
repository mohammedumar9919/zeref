import assert from "node:assert/strict";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

const testDir = dirname(fileURLToPath(import.meta.url));
const built = await import(pathToFileURL(join(testDir, "../dist/index.js")).href);
const { mergeByShortcode } = built;

const scrapeAbc = {
  shortcode: "ABC123xyz",
  caption: "Scrape caption",
  likes: 100,
  comments: 10,
  thumbnailUrl: "https://cdn.example.test/scrape-thumb.jpg",
  url: "https://www.instagram.com/p/ABC123xyz/",
  mediaType: "image",
};

const graphAbc = {
  id: "18000000000000001",
  caption: "Graph caption wins",
  media_type: "IMAGE",
  media_url: "https://cdn.example.test/graph-abc.jpg",
  permalink: "https://www.instagram.com/p/ABC123xyz/",
  timestamp: "2024-03-10T12:00:00+0000",
  like_count: 5000,
  comments_count: 120,
};

test("mergeByShortcode produces one payload per shortcode (Q1)", () => {
  const merged = mergeByShortcode({
    scrape: [scrapeAbc],
    graph: [graphAbc],
  });
  assert.equal(merged.length, 1);
  const row = merged[0];
  assert.equal(row.shortcode, "ABC123xyz");
  assert.deepEqual(row.sources.sort(), ["graph", "scrape"]);
  assert.equal(row.graph?.id, "18000000000000001");
  assert.equal(row.scrape?.likes, 5000);
  assert.equal(row.scrape?.comments, 120);
  assert.equal(row.scrape?.caption, "Graph caption wins");
  assert.equal(
    row.scrape?.thumbnailUrl,
    "https://cdn.example.test/scrape-thumb.jpg",
  );
});

test("mergeByShortcode keeps scrape-only rows", () => {
  const merged = mergeByShortcode({ scrape: [scrapeAbc] });
  assert.equal(merged.length, 1);
  assert.deepEqual(merged[0].sources, ["scrape"]);
  assert.equal(merged[0].graph, undefined);
});

test("mergeByShortcode keeps graph-only rows", () => {
  const merged = mergeByShortcode({ graph: [graphAbc] });
  assert.equal(merged.length, 1);
  assert.deepEqual(merged[0].sources, ["graph"]);
  assert.equal(merged[0].graph?.like_count, 5000);
});

test("mergeByShortcode merges distinct shortcodes", () => {
  const graphDef = {
    id: "18000000000000002",
    permalink: "https://www.instagram.com/reel/DEF456uvw/",
    media_type: "VIDEO",
    like_count: 12000,
    comments_count: 340,
  };
  const merged = mergeByShortcode({
    scrape: [scrapeAbc],
    graph: [graphAbc, graphDef],
  });
  assert.equal(merged.length, 2);
  const codes = merged.map((m) => m.shortcode).sort();
  assert.deepEqual(codes, ["ABC123xyz", "DEF456uvw"]);
});
