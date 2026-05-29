import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

const testDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(testDir, "../../..");

const built = await import(pathToFileURL(join(testDir, "../dist/index.js")).href);
const { parsePostHtml, mergeByShortcode, mapGraphMediaItem } = built;

test("fixture parse + graph merge yields one row per overlapping shortcode", () => {
  const html = readFileSync(
    join(repoRoot, "fixtures/phase-2/html/post-hydration-ABC123xyz.html"),
    "utf8",
  );
  const { posts: scrapePosts } = parsePostHtml(html);
  const graphRaw = JSON.parse(
    readFileSync(
      join(repoRoot, "fixtures/phase-2/graph/media-list.json"),
      "utf8",
    ),
  );
  const graph = graphRaw.data.map(mapGraphMediaItem);
  const merged = mergeByShortcode({ scrape: scrapePosts, graph });
  const abc = merged.find((m) => m.shortcode === "ABC123xyz");
  assert.ok(abc);
  assert.deepEqual(abc.sources.sort(), ["graph", "scrape"]);
  assert.equal(abc.graph?.like_count, 5000);
  assert.equal(abc.scrape?.thumbnailUrl, "https://cdn.example.test/thumb-abc.jpg");
});
