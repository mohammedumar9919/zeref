import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const testDir = dirname(fileURLToPath(import.meta.url));
const webRoot = join(testDir, "..");

const { getInstagramHealthResponse } = await import(
  pathToFileURL(join(webRoot, "lib/ops/instagram-health.ts")).href
);

const savedToken = process.env.INSTAGRAM_ACCESS_TOKEN;

afterEach(() => {
  if (savedToken === undefined) {
    delete process.env.INSTAGRAM_ACCESS_TOKEN;
  } else {
    process.env.INSTAGRAM_ACCESS_TOKEN = savedToken;
  }
});

describe("instagram-health ops probe (CLOUD-B1)", () => {
  it("returns configured:false when token missing", async () => {
    delete process.env.INSTAGRAM_ACCESS_TOKEN;
    const body = await getInstagramHealthResponse({ accessToken: null });
    assert.deepEqual(body, { configured: false, reachable: false });
  });

  it("returns configured:false when env token empty", async () => {
    process.env.INSTAGRAM_ACCESS_TOKEN = "   ";
    const body = await getInstagramHealthResponse();
    assert.deepEqual(body, { configured: false, reachable: false });
  });

  it("returns reachable:true with userId/username on mocked Graph success", async () => {
    const fetchImpl = async (input) => {
      const url = String(input);
      assert.match(url, /graph\.instagram\.com\/me/);
      assert.match(url, /fields=id%2Cusername|fields=id,username/);
      assert.match(url, /access_token=test-token/);
      return {
        ok: true,
        status: 200,
        statusText: "OK",
        async json() {
          return { id: "17841400000000000", username: "zeref_demo" };
        },
        async text() {
          return "";
        },
      };
    };

    const body = await getInstagramHealthResponse({
      accessToken: "test-token",
      fetchImpl,
    });
    assert.equal(body.configured, true);
    assert.equal(body.reachable, true);
    assert.equal(body.userId, "17841400000000000");
    assert.equal(body.username, "zeref_demo");
    assert.equal(body.error, undefined);
  });

  it("returns reachable:false with short error on mocked Graph failure", async () => {
    const fetchImpl = async () => ({
      ok: false,
      status: 400,
      statusText: "Bad Request",
      async json() {
        return {};
      },
      async text() {
        return '{"error":{"message":"Invalid OAuth access token"}}';
      },
    });

    const body = await getInstagramHealthResponse({
      accessToken: "bad-token",
      fetchImpl,
    });
    assert.equal(body.configured, true);
    assert.equal(body.reachable, false);
    assert.ok(typeof body.error === "string" && body.error.length > 0);
    assert.match(body.error, /400/);
  });

  it("returns reachable:false when fetch throws", async () => {
    const fetchImpl = async () => {
      throw new Error("network down");
    };

    const body = await getInstagramHealthResponse({
      accessToken: "test-token",
      fetchImpl,
    });
    assert.equal(body.configured, true);
    assert.equal(body.reachable, false);
    assert.equal(body.error, "network down");
  });
});
