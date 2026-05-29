import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

const testDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(testDir, "../../..");
const fixturesHtml = join(repoRoot, "fixtures/phase-2/html");

const built = await import(pathToFileURL(join(testDir, "../dist/index.js")).href);
const { parsePostHtml, parsePostHtmlByShortcode } = built;

function loadHtml(name) {
  return readFileSync(join(fixturesHtml, name), "utf8");
}

test("parsePostHtml extracts hydration fixture post", () => {
  const html = loadHtml("post-hydration-ABC123xyz.html");
  const result = parsePostHtml(html);
  assert.equal(result.source, "hydration");
  assert.equal(result.posts.length, 1);
  const post = result.posts[0];
  assert.equal(post.shortcode, "ABC123xyz");
  assert.equal(post.likes, 4200);
  assert.equal(post.comments, 88);
  assert.match(post.caption ?? "", /Hydration fixture caption/);
  assert.equal(post.mediaType, "image");
  assert.equal(post.thumbnailUrl, "https://cdn.example.test/thumb-abc.jpg");
});

test("parsePostHtml extracts embedded _sharedData reel", () => {
  const html = loadHtml("post-embedded-DEF456uvw.html");
  const result = parsePostHtml(html);
  assert.equal(result.source, "embedded");
  assert.equal(result.posts.length, 1);
  const post = result.posts[0];
  assert.equal(post.shortcode, "DEF456uvw");
  assert.equal(post.mediaType, "reel");
  assert.equal(post.likes, 9001);
  assert.equal(post.comments, 42);
  assert.equal(post.videoUrl, "https://cdn.example.test/video-def.mp4");
});

test("parsePostHtmlByShortcode returns null for missing shortcode", () => {
  const html = loadHtml("post-hydration-ABC123xyz.html");
  assert.equal(parsePostHtmlByShortcode(html, "NOTFOUND99"), null);
});
