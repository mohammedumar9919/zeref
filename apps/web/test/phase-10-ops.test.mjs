import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { after, before, describe, it } from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";
import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";

const testDir = dirname(fileURLToPath(import.meta.url));
const webRoot = join(testDir, "..");
const repoRoot = join(webRoot, "../..");
const fixturesRoot = join(repoRoot, "fixtures/phase-10");
const dbPkgRoot = join(repoRoot, "packages/db");
const migrationsFolder = join(dbPkgRoot, "drizzle");
const defaultUrl = "postgres://zeref:zeref@localhost:5434/zeref";

const contracts = await import(
  pathToFileURL(join(repoRoot, "packages/contracts/dist/index.js")).href
);
const workerHealthRoute = await import(
  pathToFileURL(join(webRoot, "app/api/v1/ops/worker-health/route.ts")).href
);
const workerHealthLib = await import(
  pathToFileURL(join(webRoot, "lib/ops/worker-health.ts")).href
);
const simulatedPipeline = await import(
  pathToFileURL(join(webRoot, "lib/cockpit/simulated-pipeline.ts")).href
);
const cockpitBus = await import(
  pathToFileURL(join(webRoot, "lib/cockpit/cockpit-event-bus.ts")).href
);
const outboxDrain = await import(
  pathToFileURL(join(webRoot, "lib/cockpit/outbox-drain.ts")).href
);
const dbModule = await import(pathToFileURL(join(webRoot, "lib/db.ts")).href);
const eventsRoute = await import(
  pathToFileURL(join(webRoot, "app/api/v1/events/stream/route.ts")).href
);

function loadFixture(name) {
  return JSON.parse(readFileSync(join(fixturesRoot, name), "utf8"));
}

function clearPhase10Env() {
  delete process.env.ZEREF_BFF_FIXTURE;
  delete process.env.ZEREF_WORKER_AVAILABLE;
  delete process.env.DATABASE_URL;
}

describe("phase 10 ops (fixture mode)", () => {
  before(() => {
    clearPhase10Env();
    process.env.ZEREF_BFF_FIXTURE = "1";
  });

  after(() => {
    clearPhase10Env();
    cockpitBus.resetCockpitEventBusForTests();
    dbModule.resetDbPoolForTests();
  });

  it("worker-health.valid.json round-trips WorkerHealthResponseSchema (C115)", () => {
    const raw = loadFixture("worker-health.valid.json");
    const parsed = contracts.WorkerHealthResponseSchema.parse(raw);
    assert.equal(parsed.consuming, false);
    assert.equal(parsed.source, "fixture");
    contracts.WorkerHealthResponseSchema.parse(JSON.parse(JSON.stringify(parsed)));
  });

  it("GET /api/v1/ops/worker-health returns consuming:false honestly (C113)", async () => {
    const response = await workerHealthRoute.GET();
    assert.equal(response.status, 200);
    const body = await response.json();
    contracts.WorkerHealthResponseSchema.parse(body);
    assert.equal(body.consuming, false);
    assert.equal(body.source, "fixture");
  });

  it("resolveWorkerHealth uses env source when worker absent without fixture", () => {
    delete process.env.ZEREF_BFF_FIXTURE;
    delete process.env.ZEREF_WORKER_AVAILABLE;
    const health = workerHealthLib.resolveWorkerHealth();
    contracts.WorkerHealthResponseSchema.parse(health);
    assert.equal(health.consuming, false);
    assert.equal(health.source, "env");
  });

  it("resolveWorkerHealth reports pg-boss when ZEREF_WORKER_AVAILABLE=1", () => {
    delete process.env.ZEREF_BFF_FIXTURE;
    process.env.ZEREF_WORKER_AVAILABLE = "1";
    const health = workerHealthLib.resolveWorkerHealth();
    assert.equal(health.consuming, true);
    assert.equal(health.source, "pg-boss");
  });

  it("C117: isOutboxDrainAllowed is false when worker unavailable", () => {
    delete process.env.ZEREF_WORKER_AVAILABLE;
    assert.equal(simulatedPipeline.isOutboxDrainAllowed(), false);
  });

  it("C117: emitSimulatedPipelineIfWorkerAbsent emits only simulated pipeline", () => {
    cockpitBus.resetCockpitEventBusForTests();
    delete process.env.ZEREF_WORKER_AVAILABLE;

    const received = [];
    cockpitBus.getCockpitEventBus().subscribe((eventType, data) => {
      received.push({ eventType, data });
    });

    simulatedPipeline.emitSimulatedPipelineIfWorkerAbsent();

    const pipelineEvents = received.filter((event) => event.eventType === "pipeline");
    assert.equal(pipelineEvents.length, 1);
    assert.equal(pipelineEvents[0].data.simulated, true);
    contracts.PipelineEventSchema.parse(pipelineEvents[0].data);
  });

  it("C117: SSE stream has no non-simulated pipeline when worker unavailable", async () => {
    cockpitBus.resetCockpitEventBusForTests();
    process.env.ZEREF_BFF_FIXTURE = "1";
    delete process.env.ZEREF_WORKER_AVAILABLE;

    const response = await eventsRoute.GET();
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    const deadline = Date.now() + 3000;
    while (Date.now() < deadline) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      if (buffer.includes("event: pipeline")) break;
    }

    await reader.cancel();
    assert.match(buffer, /event: pipeline/);
    assert.match(buffer, /"simulated":true/);
    assert.doesNotMatch(buffer, /"simulated":false/);
  });

  it("C124: worker-health handler needs no DATABASE_URL (no sync DB)", async () => {
    delete process.env.DATABASE_URL;
    dbModule.resetDbPoolForTests();
    const response = await workerHealthRoute.GET();
    assert.equal(response.status, 200);
    assert.equal(dbModule.getDb(), null);
  });

  it("C117: events/stream gates outbox drain on isOutboxDrainAllowed", async () => {
    const source = readFileSync(
      join(webRoot, "app/api/v1/events/stream/route.ts"),
      "utf8",
    );
    assert.match(source, /isOutboxDrainAllowed\(\)/);
    assert.match(source, /if \(getDb\(\) && isOutboxDrainAllowed\(\)\)/);
  });

  it("C124: events/stream outbox poll is async (no await on drain in handler)", async () => {
    const source = readFileSync(
      join(webRoot, "app/api/v1/events/stream/route.ts"),
      "utf8",
    );
    assert.match(source, /void drainCockpitOutboxOnce\(\)/);
    assert.match(source, /setInterval\(\(\) => \{\s*void drainCockpitOutboxOnce\(\)/s);
    assert.doesNotMatch(source, /await drainCockpitOutboxOnce/);
  });
});

describe(
  "phase 10 ops (outbox drain)",
  { skip: process.env.SKIP_DB_TESTS === "1" },
  () => {
    /** @type {pg.Pool | undefined} */
    let pool;
    let testDbName;
    let databaseUrl;
    let testDbUrl;
    let dbReady = false;

    before(async () => {
      delete process.env.ZEREF_BFF_FIXTURE;
      delete process.env.ZEREF_WORKER_AVAILABLE;
      process.env.ZEREF_WORKER_AVAILABLE = "1";
      databaseUrl = process.env.DATABASE_URL ?? defaultUrl;
      const admin = new pg.Client({ connectionString: databaseUrl });
      try {
        await admin.connect();
      } catch (err) {
        if (err?.code === "ECONNREFUSED" || err?.name === "AggregateError") {
          return;
        }
        throw err;
      }

      try {
        testDbName = `zeref_ops_p10_${Date.now()}`;
        await admin.query(`CREATE DATABASE ${testDbName}`);
        await admin.end();

        const testUrl = new URL(databaseUrl);
        testUrl.pathname = `/${testDbName}`;
        testDbUrl = testUrl.toString();
        pool = new pg.Pool({ connectionString: testDbUrl });
        const db = drizzle(pool);
        await migrate(db, { migrationsFolder });
        dbReady = true;
      } catch {
        try {
          await admin.end();
        } catch {
          // ignore
        }
      }
    });

    after(async () => {
      delete process.env.ZEREF_WORKER_AVAILABLE;
      dbModule.resetDbPoolForTests();
      cockpitBus.resetCockpitEventBusForTests();
      if (pool) {
        const admin = new pg.Client({ connectionString: databaseUrl });
        await admin.connect();
        await pool.end();
        await admin.query(`DROP DATABASE IF EXISTS ${testDbName}`);
        await admin.end();
      }
      delete process.env.DATABASE_URL;
    });

    it("drainCockpitOutboxOnce emits pipeline simulated:false (C116)", async (t) => {
      if (!dbReady) {
        t.skip("postgres unavailable for outbox drain integration test");
        return;
      }
      process.env.DATABASE_URL = testDbUrl;
      dbModule.resetDbPoolForTests();
      cockpitBus.resetCockpitEventBusForTests();

      const payload = {
        type: "pipeline",
        stage: "embed",
        message: "Embed job completed",
        ts: new Date().toISOString(),
        simulated: false,
      };

      await pool.query(
        `INSERT INTO cockpit_sse_outbox (event_type, payload_json)
         VALUES ($1, $2::jsonb)`,
        ["pipeline", JSON.stringify(payload)],
      );

      const received = [];
      cockpitBus.getCockpitEventBus().subscribe((eventType, data) => {
        received.push({ eventType, data });
      });

      const drained = await outboxDrain.drainCockpitOutboxOnce();
      assert.equal(drained, 1);

      const pipelineEvents = received.filter((event) => event.eventType === "pipeline");
      assert.equal(pipelineEvents.length, 1);
      assert.equal(pipelineEvents[0].data.simulated, false);
      contracts.PipelineEventSchema.parse(pipelineEvents[0].data);
    });
  },
);
