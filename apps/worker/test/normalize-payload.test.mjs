import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

const testDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(testDir, "../../..");
const fixturesRoot = join(repoRoot, "fixtures/phase-12");

const { buildNormalizedPostPayload, parseMergedSnapshotPayload } = await import(
  pathToFileURL(join(testDir, "../dist/lib/normalize-payload.js")).href
);

const { MergedInstagramPostPayloadSchema } = await import(
  pathToFileURL(join(repoRoot, "packages/contracts/dist/index.js")).href
);

function loadFixture(name) {
  return JSON.parse(readFileSync(join(fixturesRoot, name), "utf8"));
}

test("buildNormalizedPostPayload preserves scrape-wins media (C164)", () => {
  const merged = parseMergedSnapshotPayload(
    MergedInstagramPostPayloadSchema.parse(loadFixture("merged-post-with-media.valid.json")),
  );
  const normalized = buildNormalizedPostPayload(
    merged,
    "phase3-v1",
    "22222222-2222-4222-8222-222222222222",
  );

  assert.equal(normalized.shortcode, "CAR789xyz");
  assert.equal(normalized.thumbnailUrl, "https://scontent.cdninstagram.com/v/thumb-carousel.jpg");
  assert.equal(normalized.videoUrl, "https://scontent.cdninstagram.com/v/reel-preview.mp4");
  assert.deepEqual(normalized.carouselUrls, [
    "https://scontent.cdninstagram.com/v/carousel-1.jpg",
    "https://scontent.cdninstagram.com/v/carousel-2.jpg",
  ]);
  assert.equal(normalized.mediaType, "CAROUSEL_ALBUM");
  assert.equal(normalized.caption, "Carousel night ride highlights.");
  assert.equal(normalized.likes, 842);
  assert.equal(normalized.comments, 19);
});

test("buildNormalizedPostPayload omits media when scrape has none", () => {
  const merged = parseMergedSnapshotPayload({
    shortcode: "GRAPH01",
    sources: ["graph"],
    graph: {
      id: "18123456789012345",
      caption: "Graph only post.",
      media_type: "IMAGE",
      media_url: "https://scontent.cdninstagram.com/v/graph-only.jpg",
      permalink: "https://www.instagram.com/p/GRAPH01/",
      timestamp: "2026-06-10T18:30:00+0000",
      like_count: 10,
      comments_count: 1,
    },
  });

  const normalized = buildNormalizedPostPayload(merged, "phase3-v1");

  assert.equal(normalized.thumbnailUrl, undefined);
  assert.equal(normalized.videoUrl, undefined);
  assert.equal(normalized.carouselUrls, undefined);
  assert.equal(normalized.mediaType, "IMAGE");
});
