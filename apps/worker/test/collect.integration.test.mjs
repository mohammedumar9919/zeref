import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";

const testDir = dirname(fileURLToPath(import.meta.url));
const workerRoot = join(testDir, "..");
const repoRoot = join(workerRoot, "../..");
const dbPkgRoot = join(repoRoot, "packages/db");
const migrationsFolder = join(dbPkgRoot, "drizzle");
const fixturesGraph = join(repoRoot, "fixtures/phase-2/graph");
const fixturesHtml = join(repoRoot, "fixtures/phase-2/html");

const defaultUrl = "postgres://zeref:zeref@localhost:35432/zeref";

function resolveDatabaseUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  return defaultUrl;
}

function dockerAvailable() {
  const res = spawnSync("docker", ["info"], { stdio: "ignore", shell: true });
  return res.status === 0;
}

async function waitForPostgres(client, attempts = 30) {
  for (let i = 0; i < attempts; i += 1) {
    try {
      await client.query("SELECT 1");
      return;
    } catch {
      await new Promise((r) => setTimeout(r, 1000));
    }
  }
  throw new Error("Postgres did not become ready");
}

function loadJson(name) {
  return JSON.parse(readFileSync(join(fixturesGraph, name), "utf8"));
}

function mockGraphFetch(routes) {
  return async (input) => {
    const url = new URL(String(input));
    const path = url.pathname.replace(/^\//, "");
    const key = path.split("?")[0];
    const body = routes[key];
    if (!body) {
      return new Response(`not found: ${key}`, { status: 404 });
    }
    return new Response(JSON.stringify(body), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  };
}

describe("@zeref/worker collect integration", { skip: process.env.SKIP_DB_TESTS === "1" }, () => {
  /** @type {pg.Pool} */
  let pool;
  /** @type {string} */
  let testDbName;
  /** @type {string} */
  let databaseUrl;
  /** @type {import('../dist/jobs/collect.js').runCollect} */
  let runCollect;
  /** @type {string} */
  let platformAccountId;

  before(async () => {
    if (!existsSync(join(migrationsFolder, "0000_phase1_pipeline.sql"))) {
      throw new Error("Missing migration 0000_phase1_pipeline.sql");
    }

    databaseUrl = resolveDatabaseUrl();
    const admin = new pg.Client({ connectionString: databaseUrl });
    try {
      await admin.connect();
    } catch (err) {
      if (!dockerAvailable()) {
        throw new Error(
          `Postgres unavailable at ${databaseUrl}. Set DATABASE_URL or start docker compose db. (${err})`,
        );
      }
      throw err;
    }
    await waitForPostgres(admin);
    testDbName = `zeref_worker_test_${Date.now()}`;
    await admin.query(`CREATE DATABASE ${testDbName}`);
    await admin.end();

    const testUrl = new URL(databaseUrl);
    testUrl.pathname = `/${testDbName}`;
    pool = new pg.Pool({ connectionString: testUrl.toString() });
    const db = drizzle(pool);
    await migrate(db, { migrationsFolder });

    const account = await pool.query(
      `INSERT INTO platform_accounts (platform, external_id, display_name)
       VALUES ('instagram', 'fixture_user', 'Fixture') RETURNING id`,
    );
    platformAccountId = account.rows[0].id;

    const built = await import(
      pathToFileURL(join(workerRoot, "dist/jobs/collect.js")).href
    );
    runCollect = built.runCollect;
  });

  after(async () => {
    if (pool) {
      const admin = new pg.Client({ connectionString: databaseUrl });
      await admin.connect();
      await pool.end();
      await admin.query(`DROP DATABASE IF EXISTS ${testDbName}`);
      await admin.end();
    }
  });

  it("INSERTs merged snapshot and returns CollectJobOutput", async () => {
    const userFixture = loadJson("user.json");
    const mediaFixture = loadJson("media-list.json");
    const graphFetch = mockGraphFetch({
      me: userFixture,
      [`${userFixture.id}/media`]: mediaFixture,
    });

    const html = readFileSync(
      join(fixturesHtml, "post-hydration-ABC123xyz.html"),
      "utf8",
    );

    const output = await runCollect(
      {
        jobType: "collect",
        platform: "instagram",
        kind: "instagram_post_raw",
        platformAccountId,
        sources: ["scrape", "graph"],
        shortcodes: ["ABC123xyz"],
      },
      {
        pool,
        repoRoot,
        graphAccessToken: "test-token",
        graphUserId: userFixture.id,
        graphBaseUrl: "https://graph.test/",
        graphFetch,
        loadScrapeHtml: async () => html,
      },
    );

    assert.match(output.contentHash, /^sha256:[a-f0-9]{64}$/);
    assert.equal(output.shortcode, "ABC123xyz");

    const row = await pool.query(
      `SELECT payload_json, content_hash FROM snapshots WHERE id = $1`,
      [output.snapshotId],
    );
    assert.equal(row.rowCount, 1);
    assert.equal(row.rows[0].content_hash, output.contentHash);
    const payload = row.rows[0].payload_json;
    assert.deepEqual(payload.sources.sort(), ["graph", "scrape"]);
    assert.equal(payload.shortcode, "ABC123xyz");
  });

  it("C8 dedupe returns existing snapshotId on identical payload", async () => {
    const userFixture = loadJson("user.json");
    const mediaFixture = loadJson("media-list.json");
    const graphFetch = mockGraphFetch({
      me: userFixture,
      [`${userFixture.id}/media`]: mediaFixture,
    });
    const html = readFileSync(
      join(fixturesHtml, "post-hydration-ABC123xyz.html"),
      "utf8",
    );
    const deps = {
      pool,
      repoRoot,
      graphAccessToken: "test-token",
      graphUserId: userFixture.id,
      graphBaseUrl: "https://graph.test/",
      graphFetch,
      loadScrapeHtml: async () => html,
    };
    const input = {
      jobType: "collect",
      platform: "instagram",
      kind: "instagram_post_raw",
      platformAccountId,
      sources: ["scrape", "graph"],
      shortcodes: ["ABC123xyz"],
    };

    const first = await runCollect(input, deps);
    const second = await runCollect(input, deps);
    assert.equal(second.snapshotId, first.snapshotId);
    assert.equal(second.contentHash, first.contentHash);

    const count = await pool.query(
      `SELECT COUNT(*)::int AS n FROM snapshots WHERE content_hash = $1 AND platform_account_id = $2`,
      [first.contentHash, platformAccountId],
    );
    assert.equal(count.rows[0].n, 1);
  });

  it("enforces snapshot payload immutability (C6)", async () => {
    const userFixture = loadJson("user.json");
    const mediaFixture = loadJson("media-list.json");
    const graphFetch = mockGraphFetch({
      me: userFixture,
      [`${userFixture.id}/media`]: mediaFixture,
    });
    const html = readFileSync(
      join(fixturesHtml, "post-embedded-DEF456uvw.html"),
      "utf8",
    );

    const output = await runCollect(
      {
        jobType: "collect",
        platform: "instagram",
        kind: "instagram_post_raw",
        platformAccountId,
        sources: ["scrape", "graph"],
        shortcodes: ["DEF456uvw"],
      },
      {
        pool,
        repoRoot,
        graphAccessToken: "test-token",
        graphUserId: userFixture.id,
        graphBaseUrl: "https://graph.test/",
        graphFetch,
        loadScrapeHtml: async () => html,
      },
    );

    await assert.rejects(
      () =>
        pool.query(`UPDATE snapshots SET payload_json = '{"tamper":true}'::jsonb WHERE id = $1`, [
          output.snapshotId,
        ]),
      /immutable/i,
    );
  });
});
