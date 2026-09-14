import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const testDir = dirname(fileURLToPath(import.meta.url));
const webRoot = join(testDir, "..");

const { getFacebookHealthResponse } = await import(
  pathToFileURL(join(webRoot, "lib/ops/facebook-health.ts")).href
);

const savedToken = process.env.FACEBOOK_ACCESS_TOKEN;
const savedIgId = process.env.FACEBOOK_IG_BUSINESS_ID;
const savedFixture = process.env.ZEREF_BFF_FIXTURE;

afterEach(() => {
  if (savedToken === undefined) {
    delete process.env.FACEBOOK_ACCESS_TOKEN;
  } else {
    process.env.FACEBOOK_ACCESS_TOKEN = savedToken;
  }
  if (savedIgId === undefined) {
    delete process.env.FACEBOOK_IG_BUSINESS_ID;
  } else {
    process.env.FACEBOOK_IG_BUSINESS_ID = savedIgId;
  }
  if (savedFixture === undefined) {
    delete process.env.ZEREF_BFF_FIXTURE;
  } else {
    process.env.ZEREF_BFF_FIXTURE = savedFixture;
  }
});

describe("facebook-health ops probe (CLOUD-B3)", () => {
  it("returns configured:false when token missing", async () => {
    delete process.env.FACEBOOK_ACCESS_TOKEN;
    delete process.env.FACEBOOK_IG_BUSINESS_ID;
    const body = await getFacebookHealthResponse({ accessToken: null, igBusinessId: null });
    assert.deepEqual(body, { configured: false, reachable: false });
  });

  it("returns configured:false when env token empty", async () => {
    process.env.FACEBOOK_ACCESS_TOKEN = "   ";
    process.env.FACEBOOK_IG_BUSINESS_ID = "17841400000000001";
    const body = await getFacebookHealthResponse();
    assert.deepEqual(body, { configured: false, reachable: false });
  });

  it("returns configured:false when ig business id missing", async () => {
    const body = await getFacebookHealthResponse({
      accessToken: "fb-test-token",
      igBusinessId: null,
    });
    assert.equal(body.configured, false);
    assert.equal(body.reachable, false);
    assert.match(body.error ?? "", /FACEBOOK_IG_BUSINESS_ID/);
  });

  it("skips network in fixture mode when configured", async () => {
    let called = 0;
    const fetchImpl = async () => {
      called += 1;
      throw new Error("network should not be called");
    };
    const body = await getFacebookHealthResponse({
      accessToken: "fb-test-token",
      igBusinessId: "17841400000000001",
      fixtureMode: true,
      fetchImpl,
    });
    assert.equal(called, 0);
    assert.equal(body.configured, true);
    assert.equal(body.reachable, true);
    assert.equal(body.businessDiscovery, false);
    assert.equal(body.sampleUsername, "nasa");
    assert.equal(body.igBusinessId, "17841400000000001");
  });

  it("returns reachable:true on mocked Facebook Graph BD success", async () => {
    const fetchImpl = async (input) => {
      const url = String(input);
      assert.match(url, /graph\.facebook\.com/);
      assert.doesNotMatch(url, /graph\.instagram\.com/);
      assert.match(url, /business_discovery/);
      assert.match(url, /nasa/);
      return {
        ok: true,
        status: 200,
        async text() {
          return JSON.stringify({
            id: "17841400000000001",
            business_discovery: {
              username: "nasa",
              name: "NASA",
              followers_count: 1,
              media_count: 1,
              media: { data: [] },
            },
          });
        },
        async json() {
          return JSON.parse(await this.text());
        },
      };
    };

    const body = await getFacebookHealthResponse({
      accessToken: "fb-test-token",
      igBusinessId: "17841400000000001",
      fixtureMode: false,
      fetchImpl,
    });
    assert.equal(body.configured, true);
    assert.equal(body.reachable, true);
    assert.equal(body.businessDiscovery, true);
    assert.equal(body.sampleUsername, "nasa");
    assert.equal(body.error, undefined);
  });

  it("returns reachable:false with short error on mocked Graph failure", async () => {
    const fetchImpl = async () => ({
      ok: false,
      status: 400,
      async text() {
        return JSON.stringify({
          error: { message: "Invalid OAuth access token fb-secret-token-value", code: 190 },
        });
      },
    });

    const body = await getFacebookHealthResponse({
      accessToken: "fb-secret-token-value",
      igBusinessId: "17841400000000001",
      fixtureMode: false,
      fetchImpl,
    });
    assert.equal(body.configured, true);
    assert.equal(body.reachable, false);
    assert.equal(body.businessDiscovery, false);
    assert.ok(typeof body.error === "string" && body.error.length > 0);
    assert.doesNotMatch(body.error, /fb-secret-token-value/);
  });
});
