import assert from "node:assert/strict";
import { dirname, join } from "node:path";
import { after, before, describe, it } from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

const testDir = dirname(fileURLToPath(import.meta.url));
const webRoot = join(testDir, "..");

function clearMemoryEnv() {
  delete process.env.ZEREF_MEMORY_MOCK;
  delete process.env.ZEREF_BFF_FIXTURE;
  delete process.env.ZEREF_WORKER_AVAILABLE;
}

const cockpitBus = await import(
  pathToFileURL(join(webRoot, "lib/cockpit/cockpit-event-bus.ts")).href
);
const emitBrain = await import(
  pathToFileURL(join(webRoot, "lib/memory/emit-brain-events.ts")).href
);
const memorySearchRoute = await import(
  pathToFileURL(join(webRoot, "app/api/v1/memory/search/route.ts")).href
);
const eventsRoute = await import(
  pathToFileURL(join(webRoot, "app/api/v1/events/stream/route.ts")).href
);

describe("cockpit-event-bus", () => {
  after(() => {
    cockpitBus.resetCockpitEventBusForTests();
  });

  it("getVoiceEventBus alias shares singleton with getCockpitEventBus", async () => {
    cockpitBus.resetCockpitEventBusForTests();
    const voice = await import(
      pathToFileURL(join(webRoot, "lib/voice/voice-event-bus.ts")).href
    );
    assert.equal(voice.getVoiceEventBus(), cockpitBus.getCockpitEventBus());
  });
});

describe("emitMemoryBrainEventsFromToolCalls", () => {
  after(() => {
    cockpitBus.resetCockpitEventBusForTests();
    clearMemoryEnv();
  });

  it("emits Zod-valid memory.saved and memory.contradiction from tool results", () => {
    cockpitBus.resetCockpitEventBusForTests();
    const received = [];
    cockpitBus.getCockpitEventBus().subscribe((eventType, data) => {
      received.push({ eventType, data });
    });

    const ts = "2026-05-31T12:00:00.500Z";
    emitBrain.emitMemoryBrainEventsFromToolCalls([
      {
        name: "memory_save",
        result: {
          brainEvent: {
            type: "memory.saved",
            entryId: "a1000000-0000-4000-8000-000000000001",
            tier: "episodic",
            ts,
            turnId: "550e8400-e29b-41d4-a716-446655440099",
            simulated: true,
          },
          saveResult: {
            contradictions: [
              {
                entryId: "a1000000-0000-4000-8000-000000000002",
                supersededId: "a1000000-0000-4000-8000-000000000010",
              },
            ],
          },
        },
      },
    ]);

    assert.ok(received.some((e) => e.eventType === "memory.saved"));
    assert.ok(received.some((e) => e.eventType === "memory.contradiction"));
    assert.equal(received.find((e) => e.eventType === "memory.saved").data.tier, "episodic");
  });

  it("emits memory.search from memory_search tool result", () => {
    cockpitBus.resetCockpitEventBusForTests();
    const received = [];
    cockpitBus.getCockpitEventBus().subscribe((eventType, data) => {
      received.push({ eventType, data });
    });

    emitBrain.emitMemoryBrainEventsFromToolCalls([
      {
        name: "memory_search",
        result: {
          brainEvent: {
            type: "memory.search",
            query: "report headline",
            resultCount: 2,
            ts: "2026-05-31T12:00:01.000Z",
            simulated: true,
          },
        },
      },
    ]);

    assert.equal(received.length, 1);
    assert.equal(received[0].eventType, "memory.search");
    assert.equal(received[0].data.resultCount, 2);
  });
});

describe("GET /api/v1/memory/search", () => {
  after(clearMemoryEnv);

  it("returns 400 when q is missing", async () => {
    const response = await memorySearchRoute.GET(
      new Request("http://localhost/api/v1/memory/search"),
    );
    assert.equal(response.status, 400);
  });

  it("returns fixture search results when ZEREF_MEMORY_MOCK=1", async () => {
    process.env.ZEREF_MEMORY_MOCK = "1";
    const response = await memorySearchRoute.GET(
      new Request("http://localhost/api/v1/memory/search?q=report%20headline"),
    );
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.query, "report headline");
    assert.ok(body.totalCount >= 0);
    assert.ok(Array.isArray(body.results));
  });
});

describe("events stream memory + pipeline", () => {
  after(() => {
    cockpitBus.resetCockpitEventBusForTests();
    clearMemoryEnv();
  });

  it("forwards memory.saved SSE frames from cockpit bus", async () => {
    cockpitBus.resetCockpitEventBusForTests();
    process.env.ZEREF_BFF_FIXTURE = "1";
    delete process.env.ZEREF_WORKER_AVAILABLE;

    const response = await eventsRoute.GET();
    assert.equal(response.status, 200);

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    cockpitBus.getCockpitEventBus().emit("memory.saved", {
      type: "memory.saved",
      entryId: "a1000000-0000-4000-8000-000000000001",
      tier: "episodic",
      ts: "2026-05-31T12:00:00.500Z",
      simulated: true,
    });

    const deadline = Date.now() + 3000;
    while (Date.now() < deadline) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      if (buffer.includes("event: memory.saved")) break;
    }

    await reader.cancel();
    assert.match(buffer, /event: memory\.saved/);
    assert.match(buffer, /episodic/);
  });

  it("emits simulated pipeline on connect when worker absent", async () => {
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
      if (buffer.includes("event: pipeline") && buffer.includes('"simulated":true')) {
        break;
      }
    }

    await reader.cancel();
    assert.match(buffer, /event: pipeline/);
    assert.match(buffer, /"simulated":true/);
  });
});