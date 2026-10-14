import assert from "node:assert/strict";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

const testDir = dirname(fileURLToPath(import.meta.url));
const built = await import(pathToFileURL(join(testDir, "../dist/index.js")).href);
const {
  createInMemoryDailyBudget,
  debugTokenExpiry,
  fetchAccountInsights,
  fetchInstagramMedia,
  fetchMediaInsights,
  graphGet,
  GRAPH_THROTTLE_ERROR_CODES,
  GraphThrottledError,
  parseGraphUsage,
  probeInsightsAvailable,
} = built;

const SECRET = "SECRET_TOKEN_123";
const APP_SECRET = "APP_SECRET_TOKEN_456";
const BASE = "https://graph.test/";

function jsonResponse(body, { status = 200, headers = {} } = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", ...headers },
  });
}

function countingFetch(responder) {
  const calls = [];
  const fetchImpl = async (input) => {
    calls.push(new URL(String(input)));
    return responder(calls.length);
  };
  return { fetchImpl, calls };
}

function assertNoSecret(err, ...secrets) {
  for (const s of secrets) {
    assert.ok(!String(err).includes(s), `String(error) leaked ${s}`);
    assert.ok(!String(err?.message).includes(s), `error.message leaked ${s}`);
    assert.ok(!String(err?.stack ?? "").includes(s), `error.stack leaked ${s}`);
  }
}

// --- parseGraphUsage -------------------------------------------------------

test("parseGraphUsage reads x-app-usage", () => {
  const usage = parseGraphUsage(
    new Headers({
      "x-app-usage": JSON.stringify({ call_count: 28, total_time: 12, total_cputime: 40 }),
    }),
  );
  assert.deepEqual(usage, {
    callCountPct: 28,
    totalTimePct: 12,
    totalCputimePct: 40,
    maxPct: 40,
  });
});

test("parseGraphUsage takes the max across business-use-case buckets", () => {
  const usage = parseGraphUsage({
    "X-Business-Use-Case-Usage": JSON.stringify({
      "17841400000000001": [
        { type: "instagram", call_count: 10, total_time: 5, total_cputime: 3, estimated_time_to_regain_access: 0 },
        { type: "instagram", call_count: 91, total_time: 7, total_cputime: 2, estimated_time_to_regain_access: 15 },
      ],
    }),
    "x-app-usage": JSON.stringify({ call_count: 5, total_time: 60, total_cputime: 1 }),
  });
  assert.equal(usage.callCountPct, 91);
  assert.equal(usage.totalTimePct, 60);
  assert.equal(usage.totalCputimePct, 3);
  assert.equal(usage.maxPct, 91);
  assert.equal(usage.estimatedTimeToRegainAccessMin, 15);
});

test("parseGraphUsage tolerates missing and malformed headers", () => {
  assert.equal(parseGraphUsage(new Headers()), null);
  assert.equal(parseGraphUsage(null), null);
  assert.equal(parseGraphUsage(undefined), null);
  assert.equal(parseGraphUsage(new Headers({ "x-app-usage": "{not json" })), null);
  assert.equal(parseGraphUsage(new Headers({ "x-app-usage": "[1,2]" })), null);
  assert.equal(parseGraphUsage(new Headers({ "x-app-usage": "{}" })), null);
  assert.equal(
    parseGraphUsage(new Headers({ "x-business-use-case-usage": '{"1":"nope"}' })),
    null,
  );
});

// --- createInMemoryDailyBudget ---------------------------------------------

test("daily budget caps calls and resets at UTC midnight", () => {
  let now = new Date("2026-10-09T23:59:58.000Z");
  const budget = createInMemoryDailyBudget({ cap: 3, now: () => now });
  assert.equal(budget.cap(), 3);
  assert.equal(budget.tryConsume(), true);
  assert.equal(budget.tryConsume(2), true);
  assert.equal(budget.used(), 3);
  assert.equal(budget.tryConsume(), false);
  assert.equal(budget.used(), 3, "rejected consume must not count");

  now = new Date("2026-10-09T23:59:59.999Z");
  assert.equal(budget.tryConsume(), false, "still the same UTC day");

  now = new Date("2026-10-10T00:00:00.000Z");
  assert.equal(budget.used(), 0);
  assert.equal(budget.tryConsume(), true);
  assert.equal(budget.used(), 1);
});

test("daily budget rejects a multi-call consume that would exceed the cap", () => {
  const budget = createInMemoryDailyBudget({
    cap: 5,
    now: () => new Date("2026-10-09T12:00:00Z"),
  });
  assert.equal(budget.tryConsume(4), true);
  assert.equal(budget.tryConsume(2), false);
  assert.equal(budget.used(), 4);
  assert.equal(budget.tryConsume(1), true);
});

// --- graphGet options ------------------------------------------------------

test("graphGet without options keeps legacy behaviour even when usage is high", async () => {
  const { fetchImpl, calls } = countingFetch(() =>
    jsonResponse(
      { id: "1" },
      { headers: { "x-app-usage": JSON.stringify({ call_count: 99, total_time: 0, total_cputime: 0 }) } },
    ),
  );
  const body = await graphGet("me?fields=id", SECRET, fetchImpl, BASE);
  assert.deepEqual(body, { id: "1" });
  assert.equal(calls.length, 1);
});

test("graphGet throws daily_cap without calling fetch when budget is exhausted", async () => {
  const budget = createInMemoryDailyBudget({
    cap: 1,
    now: () => new Date("2026-10-09T08:00:00Z"),
  });
  const { fetchImpl, calls } = countingFetch(() => jsonResponse({ id: "1" }));
  await graphGet("me", SECRET, fetchImpl, BASE, { budget });
  assert.equal(calls.length, 1);

  await assert.rejects(
    () => graphGet("me", SECRET, fetchImpl, BASE, { budget }),
    (err) => {
      assert.ok(err instanceof GraphThrottledError);
      assert.ok(err instanceof Error);
      assert.equal(err.reason, "daily_cap");
      assert.equal(err.name, "GraphThrottledError");
      assertNoSecret(err, SECRET);
      return true;
    },
  );
  assert.equal(calls.length, 1, "fetch must not be called when over budget");
});

test("graphGet reports usage via onUsage and returns data below threshold", async () => {
  const seen = [];
  const { fetchImpl } = countingFetch(() =>
    jsonResponse(
      { id: "1" },
      { headers: { "x-app-usage": JSON.stringify({ call_count: 79, total_time: 10, total_cputime: 10 }) } },
    ),
  );
  const body = await graphGet("me", SECRET, fetchImpl, BASE, {
    onUsage: (u) => seen.push(u),
  });
  assert.deepEqual(body, { id: "1" });
  assert.equal(seen.length, 1);
  assert.equal(seen[0].maxPct, 79);
});

test("graphGet throws usage_high at the default 80% threshold after calling onUsage", async () => {
  const seen = [];
  const { fetchImpl } = countingFetch(() =>
    jsonResponse(
      { id: "1" },
      {
        headers: {
          "x-business-use-case-usage": JSON.stringify({
            "1": [{ call_count: 80, total_time: 1, total_cputime: 1, estimated_time_to_regain_access: 7 }],
          }),
        },
      },
    ),
  );
  await assert.rejects(
    () => graphGet("me", SECRET, fetchImpl, BASE, { onUsage: (u) => seen.push(u) }),
    (err) => {
      assert.ok(err instanceof GraphThrottledError);
      assert.equal(err.reason, "usage_high");
      assert.equal(err.retryAfterMin, 7);
      assert.equal(err.usage.maxPct, 80);
      assertNoSecret(err, SECRET);
      return true;
    },
  );
  assert.equal(seen.length, 1);
});

test("graphGet honours a custom throttleAtPct", async () => {
  const { fetchImpl } = countingFetch(() =>
    jsonResponse(
      { ok: true },
      { headers: { "x-app-usage": JSON.stringify({ call_count: 50, total_time: 0, total_cputime: 0 }) } },
    ),
  );
  await assert.rejects(
    () => graphGet("me", SECRET, fetchImpl, BASE, { throttleAtPct: 50 }),
    (err) => err instanceof GraphThrottledError && err.reason === "usage_high",
  );
  const body = await graphGet("me", SECRET, fetchImpl, BASE, { throttleAtPct: 95 });
  assert.deepEqual(body, { ok: true });
});

test("graphGet maps HTTP 429 to GraphThrottledError with Retry-After minutes", async () => {
  const { fetchImpl } = countingFetch(() =>
    jsonResponse(
      { error: { message: `rate limited for ${SECRET}`, code: 4 } },
      { status: 429, headers: { "retry-after": "150" } },
    ),
  );
  for (const opts of [undefined, {}]) {
    await assert.rejects(
      () => graphGet("me", SECRET, fetchImpl, BASE, opts),
      (err) => {
        assert.ok(err instanceof GraphThrottledError);
        assert.equal(err.reason, "http_429");
        assert.equal(err.retryAfterMin, 3);
        assert.match(err.message, /429/);
        assertNoSecret(err, SECRET);
        return true;
      },
    );
  }
});

test("graphGet redacts the token from non-OK error bodies", async () => {
  const { fetchImpl } = countingFetch(() =>
    new Response(
      `{"error":{"message":"Invalid OAuth access token ${SECRET}","url":"https://graph.test/me?access_token=${SECRET}"}}`,
      { status: 400 },
    ),
  );
  await assert.rejects(
    () => graphGet("me", SECRET, fetchImpl, BASE),
    (err) => {
      assert.ok(!(err instanceof GraphThrottledError));
      assert.match(err.message, /Graph API 400/);
      assertNoSecret(err, SECRET);
      return true;
    },
  );
});

test("graphGet redacts the token from network errors that echo the URL", async () => {
  const fetchImpl = async (input) => {
    throw new TypeError(`fetch failed for ${String(input)}`);
  };
  await assert.rejects(
    () => graphGet("me", SECRET, fetchImpl, BASE),
    (err) => {
      assert.match(err.message, /Graph API request failed/);
      assertNoSecret(err, SECRET);
      return true;
    },
  );
});

test("client helpers thread graph options through to every call", async () => {
  const budget = createInMemoryDailyBudget({
    cap: 1,
    now: () => new Date("2026-10-09T08:00:00Z"),
  });
  const { fetchImpl, calls } = countingFetch(() => jsonResponse({ id: "ig-1" }));
  await assert.rejects(
    () =>
      fetchInstagramMedia({
        accessToken: SECRET,
        fetchImpl,
        baseUrl: BASE,
        graph: { budget },
      }),
    (err) => err instanceof GraphThrottledError && err.reason === "daily_cap",
  );
  assert.equal(calls.length, 1, "me lookup consumed the only budget slot");
  assert.equal(budget.used(), 1);
});

// --- Meta throttling error codes -------------------------------------------

test("graphGet maps Meta throttle codes 4/17/32/613 to usage_high (with and without options)", async () => {
  assert.deepEqual([...GRAPH_THROTTLE_ERROR_CODES].sort((a, b) => a - b), [4, 17, 32, 613]);
  for (const code of [4, 17, 32, 613, "613"]) {
    const { fetchImpl } = countingFetch(() =>
      jsonResponse(
        { error: { message: `Application request limit reached ${SECRET}`, code } },
        {
          status: 403,
          headers: {
            "x-app-usage": JSON.stringify({ call_count: 100, total_time: 0, total_cputime: 0 }),
          },
        },
      ),
    );
    for (const opts of [undefined, {}]) {
      await assert.rejects(
        () => graphGet("me", SECRET, fetchImpl, BASE, opts),
        (err) => {
          assert.ok(err instanceof GraphThrottledError, `code ${code}`);
          assert.equal(err.reason, "usage_high");
          assert.equal(err.usage.maxPct, 100);
          assertNoSecret(err, SECRET);
          return true;
        },
      );
    }
  }
});

test("graphGet throttle code uses Retry-After when present", async () => {
  const { fetchImpl } = countingFetch(() =>
    jsonResponse({ error: { message: "User request limit reached", code: 17 } }, {
      status: 400,
      headers: { "retry-after": "61" },
    }),
  );
  await assert.rejects(
    () => graphGet("me", SECRET, fetchImpl, BASE),
    (err) => err instanceof GraphThrottledError && err.retryAfterMin === 2,
  );
});

test("graphGet leaves non-throttle Meta codes and non-JSON bodies as plain errors", async () => {
  for (const body of [
    JSON.stringify({ error: { message: `bad token ${SECRET}`, code: 190 } }),
    JSON.stringify({ error: { message: "nope", code: "abc" } }),
    `<html>4 17 32 613 ${SECRET}</html>`,
  ]) {
    const { fetchImpl } = countingFetch(() => new Response(body, { status: 400 }));
    await assert.rejects(
      () => graphGet("me", SECRET, fetchImpl, BASE),
      (err) => {
        assert.ok(!(err instanceof GraphThrottledError));
        assert.match(err.message, /^Graph API 400: /);
        assertNoSecret(err, SECRET);
        return true;
      },
    );
  }
});

// --- insights under the Graph budget ---------------------------------------

const INSIGHTS_BODY = { data: [{ name: "reach", period: "lifetime", values: [{ value: 5 }] }] };

test("insights without options behave as before (Meta message, no throttling on usage)", async () => {
  const { fetchImpl, calls } = countingFetch(() =>
    jsonResponse(INSIGHTS_BODY, {
      headers: { "x-app-usage": JSON.stringify({ call_count: 99, total_time: 0, total_cputime: 0 }) },
    }),
  );
  const res = await fetchMediaInsights({ accessToken: SECRET, mediaId: "m1", fetchImpl, baseUrl: BASE });
  assert.equal(res.metrics[0].values[0].value, 5);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].pathname, "/m1/insights");

  const failing = countingFetch(() =>
    jsonResponse({ error: { message: "(#10) Not enough permissions", code: 10 } }, { status: 400 }),
  );
  await assert.rejects(
    () => fetchMediaInsights({ accessToken: SECRET, mediaId: "m1", fetchImpl: failing.fetchImpl, baseUrl: BASE }),
    (err) => err.message === "(#10) Not enough permissions",
  );
  const noMessage = countingFetch(() => new Response("oops", { status: 500 }));
  await assert.rejects(
    () => fetchAccountInsights({ accessToken: SECRET, userId: "u1", fetchImpl: noMessage.fetchImpl, baseUrl: BASE }),
    (err) => err.message === "Graph account insights 500",
  );
  const meFails = countingFetch(() => new Response("oops", { status: 502 }));
  await assert.rejects(
    () => fetchAccountInsights({ accessToken: SECRET, fetchImpl: meFails.fetchImpl, baseUrl: BASE }),
    (err) => err.message === "Graph me failed: 502",
  );
});

test("insights calls (me lookup + insights) count against the Graph budget", async () => {
  const budget = createInMemoryDailyBudget({ cap: 2, now: () => new Date("2026-10-09T08:00:00Z") });
  const { fetchImpl, calls } = countingFetch((n) => (n === 1 ? jsonResponse({ id: "u1" }) : jsonResponse(INSIGHTS_BODY)));
  const res = await fetchAccountInsights({ accessToken: SECRET, fetchImpl, baseUrl: BASE, graph: { budget } });
  assert.equal(res.userId, "u1");
  assert.equal(calls.length, 2);
  assert.equal(budget.used(), 2);

  await assert.rejects(
    () => fetchMediaInsights({ accessToken: SECRET, mediaId: "m1", fetchImpl, baseUrl: BASE, graph: { budget } }),
    (err) => err instanceof GraphThrottledError && err.reason === "daily_cap",
  );
  assert.equal(calls.length, 2, "no fetch once the budget is exhausted");
});

test("insights honour usage back-off, 429 and Meta throttle codes", async () => {
  const seen = [];
  const high = countingFetch(() =>
    jsonResponse(INSIGHTS_BODY, {
      headers: { "x-app-usage": JSON.stringify({ call_count: 90, total_time: 0, total_cputime: 0 }) },
    }),
  );
  await assert.rejects(
    () =>
      fetchMediaInsights({
        accessToken: SECRET, mediaId: "m1", fetchImpl: high.fetchImpl, baseUrl: BASE,
        graph: { onUsage: (u) => seen.push(u.maxPct) },
      }),
    (err) => err instanceof GraphThrottledError && err.reason === "usage_high",
  );
  assert.deepEqual(seen, [90]);

  const rate = countingFetch(() => new Response("slow down", { status: 429 }));
  await assert.rejects(
    () => fetchMediaInsights({ accessToken: SECRET, mediaId: "m1", fetchImpl: rate.fetchImpl, baseUrl: BASE }),
    (err) => err instanceof GraphThrottledError && err.reason === "http_429",
  );

  const coded = countingFetch(() =>
    jsonResponse({ error: { message: `limit ${SECRET}`, code: 32 } }, { status: 403 }),
  );
  await assert.rejects(
    () => fetchAccountInsights({ accessToken: SECRET, userId: "u1", fetchImpl: coded.fetchImpl, baseUrl: BASE }),
    (err) => err instanceof GraphThrottledError && err.reason === "usage_high",
  );
});

test(`insights never leak the token (${SECRET}) in errors or probe messages`, async () => {
  const cases = [
    async () =>
      jsonResponse(
        { error: { message: `Invalid OAuth access token ${SECRET} (access_token=${SECRET})`, code: 190 } },
        { status: 400 },
      ),
    async () => new Response(`<html>${SECRET}</html>`, { status: 500 }),
    async (input) => {
      throw new TypeError(`fetch failed for ${String(input)}`);
    },
    async () => jsonResponse({ error: { message: `limit ${SECRET}`, code: 4 } }, { status: 400 }),
  ];
  for (const fetchImpl of cases) {
    await assert.rejects(
      () => fetchMediaInsights({ accessToken: SECRET, mediaId: "m1", fetchImpl, baseUrl: BASE }),
      (err) => {
        assertNoSecret(err, SECRET);
        return true;
      },
    );
    await assert.rejects(
      () => fetchAccountInsights({ accessToken: SECRET, fetchImpl, baseUrl: BASE }),
      (err) => {
        assertNoSecret(err, SECRET);
        return true;
      },
    );
    for (const mediaId of ["m1", undefined]) {
      const probe = await probeInsightsAvailable({ accessToken: SECRET, mediaId, userId: "u1", fetchImpl, baseUrl: BASE });
      assert.equal(probe.available, false);
      assert.ok(!probe.message.includes(SECRET), "probe message leaked the token");
    }
  }
});

// --- debugTokenExpiry ------------------------------------------------------

test("debugTokenExpiry maps expires_at and is_valid", async () => {
  const seen = [];
  const fetchImpl = async (input) => {
    const url = new URL(String(input));
    seen.push(url);
    return jsonResponse({ data: { is_valid: true, expires_at: 1791504000 } });
  };
  const result = await debugTokenExpiry({
    fetchImpl,
    appToken: APP_SECRET,
    inputToken: SECRET,
  });
  assert.equal(result.isValid, true);
  assert.equal(result.expiresAt.toISOString(), new Date(1791504000 * 1000).toISOString());
  assert.equal(seen.length, 1);
  assert.equal(seen[0].hostname, "graph.facebook.com");
  assert.match(seen[0].pathname, /\/debug_token$/);
  assert.equal(seen[0].searchParams.get("input_token"), SECRET);
  assert.equal(seen[0].searchParams.get("access_token"), APP_SECRET);
});

test("debugTokenExpiry returns null expiry for never-expiring or invalid tokens", async () => {
  const never = await debugTokenExpiry({
    fetchImpl: async () => jsonResponse({ data: { is_valid: true, expires_at: 0 } }),
    appToken: APP_SECRET,
    inputToken: SECRET,
  });
  assert.deepEqual(never, { expiresAt: null, isValid: true });

  const invalid = await debugTokenExpiry({
    fetchImpl: async () => jsonResponse({ data: { is_valid: false } }),
    appToken: APP_SECRET,
    inputToken: SECRET,
  });
  assert.deepEqual(invalid, { expiresAt: null, isValid: false });
});

test("debugTokenExpiry never leaks either token in errors", async () => {
  const cases = [
    async () =>
      jsonResponse(
        { error: { message: `Invalid token ${SECRET} via app ${APP_SECRET}`, code: 190 } },
        { status: 400 },
      ),
    async () => new Response(`<html>${SECRET} ${APP_SECRET}</html>`, { status: 500 }),
    async (input) => {
      throw new TypeError(`fetch failed for ${String(input)}`);
    },
  ];
  for (const fetchImpl of cases) {
    await assert.rejects(
      () => debugTokenExpiry({ fetchImpl, appToken: APP_SECRET, inputToken: SECRET }),
      (err) => {
        assert.ok(err instanceof Error);
        assertNoSecret(err, SECRET, APP_SECRET);
        return true;
      },
    );
  }
});
