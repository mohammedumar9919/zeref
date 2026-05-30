import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const webRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const bff = await import(pathToFileURL(join(webRoot, "lib/bff.ts")).href);

describe("getCockpitSlices (RSC fetch)", () => {
  /** @type {typeof fetch} */
  let originalFetch;

  before(() => {
    originalFetch = globalThis.fetch;
  });

  after(() => {
    globalThis.fetch = originalFetch;
  });

  it("throws CockpitBffError on HTTP error instead of silent empty", async () => {
    globalThis.fetch = async () =>
      new Response(JSON.stringify({ error: "failed" }), { status: 500 });

    await assert.rejects(
      () => bff.getCockpitSlices(),
      (err) => {
        assert.equal(err.name, "CockpitBffError");
        assert.match(err.message, /HTTP 500/);
        return true;
      },
    );
  });

  it("throws CockpitBffError on invalid JSON body", async () => {
    globalThis.fetch = async () =>
      new Response("not-json", { status: 200, headers: { "content-type": "text/plain" } });

    await assert.rejects(
      () => bff.getCockpitSlices(),
      (err) => err.name === "CockpitBffError",
    );
  });
});
