import assert from "node:assert/strict";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

const testDir = dirname(fileURLToPath(import.meta.url));
const built = await import(pathToFileURL(join(testDir, "../dist/index.js")).href);
const {
  assertLiveInstagramEnabled,
  isLiveInstagramEnabled,
  fetchPostPage,
} = built;

test("fetchPostPage requires ZEREF_LIVE_INSTAGRAM=1", async () => {
  const prev = process.env.ZEREF_LIVE_INSTAGRAM;
  delete process.env.ZEREF_LIVE_INSTAGRAM;
  try {
    assert.equal(isLiveInstagramEnabled(), false);
    assert.throws(() => assertLiveInstagramEnabled(), /ZEREF_LIVE_INSTAGRAM/);
    await assert.rejects(
      () =>
        fetchPostPage({
          url: "https://www.instagram.com/p/example/",
        }),
      /ZEREF_LIVE_INSTAGRAM/,
    );
  } finally {
    if (prev !== undefined) process.env.ZEREF_LIVE_INSTAGRAM = prev;
  }
});

test(
  "fetchPostPage live smoke",
  { skip: process.env.ZEREF_LIVE_INSTAGRAM !== "1" },
  async () => {
    const result = await fetchPostPage({
      url: "https://www.instagram.com/p/ABC123xyz/",
      timeoutMs: 60_000,
    });
    assert.ok(result.html.length > 0);
    assert.ok(typeof result.finalUrl === "string");
  },
);
