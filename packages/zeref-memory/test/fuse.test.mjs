import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, join } from "node:path";

const pkgRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const { fuseRrf, hybridFuse, tryEmbed, RRF_K, HYBRID_CANDIDATES } = await import(
  pathToFileURL(join(pkgRoot, "dist/index.js")).href
);

describe("fuseRrf (CLOUD-C4)", () => {
  it("defaults to k=60 and 20 candidates per list", () => {
    assert.equal(RRF_K, 60);
    assert.equal(HYBRID_CANDIDATES, 20);
  });

  it("ranks an item 1st in both lists first", () => {
    const fused = fuseRrf([
      ["a", "b", "c"],
      ["a", "c", "d"],
    ]);
    assert.equal(fused[0].id, "a");
    assert.equal(fused[0].score, 2 / 61);
  });

  it("keeps items that appear in only one list", () => {
    const fused = fuseRrf([["a", "b"], ["c"]]);
    assert.deepEqual(
      fused.map((f) => f.id).sort(),
      ["a", "b", "c"],
    );
    assert.equal(fused.find((f) => f.id === "b").score, 1 / 62);
  });

  it("uses 1 / (k + rank) with 1-based rank, so k changes scores", () => {
    const k60 = fuseRrf([["a", "b"]]);
    const k1 = fuseRrf([["a", "b"]], 1);
    assert.equal(k60[0].score, 1 / 61);
    assert.equal(k60[1].score, 1 / 62);
    assert.equal(k1[0].score, 1 / 2);
    assert.equal(k1[1].score, 1 / 3);
  });

  it("a small k lets one top rank beat two mid ranks; a large k does not", () => {
    const lists = [
      ["x", "m"],
      ["y", "z", "m"],
    ];
    const small = fuseRrf(lists, 0);
    assert.equal(small[0].id, "x");
    const large = fuseRrf(lists, 60);
    assert.equal(large[0].id, "m");
  });

  it("breaks ties by first appearance (list order, then rank)", () => {
    const fused = fuseRrf([
      ["a", "b"],
      ["c", "d"],
    ]);
    assert.deepEqual(
      fused.map((f) => f.id),
      ["a", "c", "b", "d"],
    );
    const again = fuseRrf([
      ["a", "b"],
      ["c", "d"],
    ]);
    assert.deepEqual(again, fused);
  });

  it("counts a duplicate id within one list once (best rank)", () => {
    const fused = fuseRrf([["a", "a", "b"]]);
    assert.deepEqual(fused, [
      { id: "a", score: 1 / 61 },
      { id: "b", score: 1 / 63 },
    ]);
  });

  it("returns an empty list for empty input and rejects negative k", () => {
    assert.deepEqual(fuseRrf([]), []);
    assert.deepEqual(fuseRrf([[], []]), []);
    assert.throws(() => fuseRrf([["a"]], -1), /k/);
  });
});

describe("tryEmbed (CLOUD-C4)", () => {
  it("returns null without an embedder", async () => {
    assert.equal(await tryEmbed(undefined, "hello"), null);
  });

  it("returns null when the embedder throws or returns nothing", async () => {
    assert.equal(
      await tryEmbed(async () => {
        throw new Error("provider down");
      }, "hello"),
      null,
    );
    assert.equal(await tryEmbed(async () => [], "hello"), null);
  });

  it("returns the vector on success", async () => {
    assert.deepEqual(await tryEmbed(async () => [0.1, 0.2], "hello"), [0.1, 0.2]);
  });
});

describe("hybridFuse (CLOUD-C4)", () => {
  const embed = async () => [1, 0, 0];

  it("returns null (lexical fallback) without an embedder and never runs vector search", async () => {
    let called = false;
    const fused = await hybridFuse({
      query: "reels",
      lexicalIds: ["a"],
      vectorSearch: async () => {
        called = true;
        return ["b"];
      },
    });
    assert.equal(fused, null);
    assert.equal(called, false);
  });

  it("returns null for a blank query", async () => {
    const fused = await hybridFuse({
      query: "   ",
      lexicalIds: ["a"],
      embed,
      vectorSearch: async () => ["b"],
    });
    assert.equal(fused, null);
  });

  it("returns null when embedding fails", async () => {
    const fused = await hybridFuse({
      query: "reels",
      lexicalIds: ["a"],
      embed: async () => {
        throw new Error("embed failed");
      },
      vectorSearch: async () => ["b"],
    });
    assert.equal(fused, null);
  });

  it("returns null when vector search fails", async () => {
    const fused = await hybridFuse({
      query: "reels",
      lexicalIds: ["a"],
      embed,
      vectorSearch: async () => {
        throw new Error("relation does not exist");
      },
    });
    assert.equal(fused, null);
  });

  it("fuses lexical top-20 with vector top-20", async () => {
    const lexicalIds = Array.from({ length: 30 }, (_, i) => `lex-${i}`);
    let requested = 0;
    const fused = await hybridFuse({
      query: "reels",
      lexicalIds,
      embed,
      vectorSearch: async (_embedding, limit) => {
        requested = limit;
        return ["vec-0", "lex-0"];
      },
    });
    assert.equal(requested, 20);
    const ids = fused.map((f) => f.id);
    assert.equal(ids[0], "lex-0");
    assert.ok(ids.includes("vec-0"));
    assert.ok(ids.includes("lex-19"));
    assert.ok(!ids.includes("lex-20"), "lexical list is capped at 20 candidates");
  });

  it("passes the query embedding to vector search", async () => {
    let seen;
    await hybridFuse({
      query: "reels",
      lexicalIds: [],
      embed: async (text) => (text === "reels" ? [0.5, 0.5] : [0]),
      vectorSearch: async (embedding) => {
        seen = embedding;
        return [];
      },
    });
    assert.deepEqual(seen, [0.5, 0.5]);
  });
});
