import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { after, beforeEach, describe, it } from "node:test";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { randomUUID } from "node:crypto";

const testDir = dirname(fileURLToPath(import.meta.url));
const webRoot = join(testDir, "..");

const handleTurn = await import(
  pathToFileURL(join(webRoot, "lib/voice/handle-turn.ts")).href
);
const parseVoice = await import(
  pathToFileURL(join(webRoot, "lib/voice/parse-voice-events.ts")).href
);
const latencyStore = await import(
  pathToFileURL(join(webRoot, "lib/voice/voice-latency-store.ts")).href
);
const latencyRoute = await import(
  pathToFileURL(join(webRoot, "app/api/v1/ops/voice-latency/route.ts")).href
);
const eventBus = await import(
  pathToFileURL(join(webRoot, "lib/cockpit/cockpit-event-bus.ts")).href
);

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function audioFor(sentence) {
  return { audioBase64: Buffer.from(sentence).toString("base64"), mimeType: "audio/wav" };
}

function decode(event) {
  return Buffer.from(event.audioBase64, "base64").toString("utf8");
}

function fakeClock(times) {
  let i = 0;
  return handleTurn.startTurnAudioClock(() => times[Math.min(i++, times.length - 1)]);
}

function clearVoiceEnv() {
  for (const key of [
    "ZEREF_WHISPER_MOCK",
    "ZEREF_TTS_MOCK",
    "ZEREF_LLM_MOCK",
    "ZEREF_BFF_FIXTURE",
    "ZEREF_PHASE11_AGENT",
    "OPENROUTER_API_KEY",
  ]) {
    delete process.env[key];
  }
}

describe("C10 pipelined sentence TTS", () => {
  it("emits in sentence order even when the first sentence synthesizes slowest", async () => {
    const emitted = [];
    const started = [];
    const finished = [];
    const delays = { "One.": 80, "Two.": 5, "Three.": 30 };
    const pipeline = handleTurn.createSentenceAudioPipeline({
      turnId: randomUUID(),
      killSignal: new AbortController().signal,
      synthesize: async (sentence) => {
        started.push(sentence);
        await delay(delays[sentence]);
        finished.push(sentence);
        return audioFor(sentence);
      },
      emit: (event) => emitted.push(event),
    });

    pipeline.enqueue("One.");
    pipeline.enqueue("Two.");
    pipeline.enqueue("Three.");
    await pipeline.drain();

    assert.deepEqual(finished, ["Two.", "Three.", "One."], "TTS ran concurrently");
    assert.deepEqual(started, ["One.", "Two.", "Three."]);
    assert.deepEqual(emitted.map(decode), ["One.", "Two.", "Three."]);
    assert.deepEqual(emitted.map((e) => e.seq), [0, 1, 2]);
    for (const event of emitted) {
      assert.equal(parseVoice.parseVoiceAudioEvent(event).phase, "result");
    }
  });

  it("starts a later sentence's TTS before an earlier one finishes", async () => {
    let firstDone = false;
    let secondStartedBeforeFirstDone = false;
    const pipeline = handleTurn.createSentenceAudioPipeline({
      turnId: randomUUID(),
      killSignal: new AbortController().signal,
      synthesize: async (sentence) => {
        if (sentence === "B.") secondStartedBeforeFirstDone = !firstDone;
        await delay(sentence === "A." ? 40 : 1);
        if (sentence === "A.") firstDone = true;
        return audioFor(sentence);
      },
      emit: () => {},
    });
    pipeline.enqueue("A.");
    await delay(5);
    pipeline.enqueue("B.");
    await pipeline.drain();
    assert.equal(secondStartedBeforeFirstDone, true);
  });

  it("emits nothing after abort (barge-in), including already-synthesized sentences", async () => {
    const controller = new AbortController();
    const emitted = [];
    const pipeline = handleTurn.createSentenceAudioPipeline({
      turnId: randomUUID(),
      killSignal: controller.signal,
      synthesize: async (sentence) => {
        await delay(sentence === "Slow." ? 50 : 1);
        return audioFor(sentence);
      },
      emit: (event) => emitted.push(event),
    });
    pipeline.enqueue("Slow.");
    pipeline.enqueue("Fast.");
    await delay(15);
    controller.abort();
    pipeline.enqueue("Late.");
    await pipeline.drain();
    assert.equal(emitted.length, 0);
    assert.equal(pipeline.enqueuedCount(), 2);
  });

  it("keeps order when a middle sentence's TTS fails", async () => {
    const emitted = [];
    const originalError = console.error;
    console.error = () => {};
    try {
      const pipeline = handleTurn.createSentenceAudioPipeline({
        turnId: randomUUID(),
        killSignal: new AbortController().signal,
        synthesize: async (sentence) => {
          await delay(sentence === "First." ? 20 : 1);
          if (sentence === "Broken.") throw new Error("tts down");
          return audioFor(sentence);
        },
        emit: (event) => emitted.push(event),
      });
      pipeline.enqueue("First.");
      pipeline.enqueue("Broken.");
      pipeline.enqueue("Last.");
      await pipeline.drain();
    } finally {
      console.error = originalError;
    }
    assert.deepEqual(emitted.map(decode), ["First.", "Last."]);
    assert.deepEqual(emitted.map((e) => e.seq), [0, 2]);
  });

  it("bounds concurrent TTS calls", async () => {
    let inFlight = 0;
    let peak = 0;
    const emitted = [];
    const pipeline = handleTurn.createSentenceAudioPipeline({
      turnId: randomUUID(),
      killSignal: new AbortController().signal,
      maxInFlight: 2,
      synthesize: async (sentence) => {
        inFlight += 1;
        peak = Math.max(peak, inFlight);
        await delay(10);
        inFlight -= 1;
        return audioFor(sentence);
      },
      emit: (event) => emitted.push(event),
    });
    for (const s of ["a.", "b.", "c.", "d.", "e."]) pipeline.enqueue(s);
    await pipeline.drain();
    assert.equal(peak, 2);
    assert.deepEqual(emitted.map(decode), ["a.", "b.", "c.", "d.", "e."]);
  });

  it("stamps serverFirstAudioMs on the first emitted audio only", async () => {
    const emitted = [];
    const clock = fakeClock([1000, 1450, 1600, 1700]);
    const pipeline = handleTurn.createSentenceAudioPipeline({
      turnId: randomUUID(),
      killSignal: new AbortController().signal,
      clock,
      synthesize: async (sentence) => audioFor(sentence),
      emit: (event) => emitted.push(event),
    });
    pipeline.enqueue("Hello.");
    pipeline.enqueue("World.");
    await pipeline.drain();
    assert.equal(emitted[0].serverFirstAudioMs, 450);
    assert.equal(emitted[1].serverFirstAudioMs, undefined);
    assert.equal(clock.firstAudioSent, true);
  });
});

describe("C10 live voice turn emits ordered audio", () => {
  after(() => {
    clearVoiceEnv();
    eventBus.resetCockpitEventBusForTests();
    handleTurn.resetPendingVoiceConfirmForTests();
  });

  it("live agent path: ascending seq, schema-valid, first audio carries serverFirstAudioMs", async () => {
    clearVoiceEnv();
    process.env.ZEREF_WHISPER_MOCK = "1";
    process.env.ZEREF_TTS_MOCK = "1";
    process.env.ZEREF_PHASE11_AGENT = "1";
    process.env.ZEREF_BFF_FIXTURE = "1";
    eventBus.resetCockpitEventBusForTests();
    handleTurn.resetPendingVoiceConfirmForTests();

    const audioEvents = [];
    eventBus.getCockpitEventBus().subscribe((eventType, data) => {
      if (eventType === "voice.audio") audioEvents.push(data);
    });

    const res = await handleTurn.handleVoiceTurn(
      new Blob([new Uint8Array([1, 2, 3, 4])], { type: "audio/wav" }),
    );
    assert.equal(res.status, 202);
    await handleTurn.waitForPendingVoiceTurns();

    assert.ok(audioEvents.length >= 1, "at least one result audio emitted");
    for (const event of audioEvents) parseVoice.parseVoiceAudioEvent(event);
    const results = audioEvents.filter((e) => e.phase === "result");
    const seqs = results.map((e) => e.seq);
    assert.deepEqual(seqs, [...seqs].sort((a, b) => a - b));
    assert.equal(new Set(seqs).size, seqs.length);
    assert.equal(typeof audioEvents[0].serverFirstAudioMs, "number");
    assert.ok(audioEvents[0].serverFirstAudioMs >= 0);
    assert.equal(
      audioEvents.filter((e) => e.serverFirstAudioMs !== undefined).length,
      1,
    );
  });

  it("sync-mock CI path stays whole-buffer JSON with no seq", async () => {
    clearVoiceEnv();
    process.env.ZEREF_WHISPER_MOCK = "1";
    process.env.ZEREF_TTS_MOCK = "1";
    process.env.ZEREF_LLM_MOCK = "1";
    process.env.ZEREF_BFF_FIXTURE = "1";
    process.env.ZEREF_PHASE11_AGENT = "1";
    eventBus.resetCockpitEventBusForTests();
    const audioEvents = [];
    eventBus.getCockpitEventBus().subscribe((eventType, data) => {
      if (eventType === "voice.audio") audioEvents.push(data);
    });
    const res = await handleTurn.handleVoiceTurn(
      new Blob([new Uint8Array([1, 2, 3])], { type: "audio/wav" }),
    );
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.mode, "sync-mock");
    assert.ok(body.resultAudio.audioBase64);
    assert.equal(body.resultAudio.seq, undefined);
    assert.equal(audioEvents.length, 0);
  });
});

describe("C10 voice-latency ops route", () => {
  beforeEach(() => latencyStore.resetVoiceLatencyStoreForTests());

  const post = (body) =>
    latencyRoute.POST(
      new Request("http://localhost/api/v1/ops/voice-latency", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: typeof body === "string" ? body : JSON.stringify(body),
      }),
    );

  it("GET with no samples reports count 0 and null percentiles (no invented number)", async () => {
    const res = await latencyRoute.GET();
    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), {
      count: 0,
      p50Ms: null,
      p95Ms: null,
      targetMs: 1200,
      lastSampleAt: null,
    });
  });

  it("POST validates samples; GET summarizes only what was posted", async () => {
    assert.equal((await post("not json")).status, 400);
    assert.equal(
      (await post({ turnId: randomUUID(), firstAudioMs: -5, source: "client" })).status,
      400,
    );
    assert.equal(
      (await post({ turnId: randomUUID(), firstAudioMs: 5, source: "server" })).status,
      400,
    );
    assert.equal((await latencyRoute.GET().then((r) => r.json())).count, 0);

    for (const ms of [900, 700, 1100, 800]) {
      const res = await post({ turnId: randomUUID(), firstAudioMs: ms, source: "client" });
      assert.equal(res.status, 202);
    }
    const summary = await latencyRoute.GET().then((r) => r.json());
    assert.equal(summary.count, 4);
    assert.equal(summary.p50Ms, 800);
    assert.equal(summary.p95Ms, 1100);
    assert.equal(summary.targetMs, 1200);
    assert.ok(!Number.isNaN(Date.parse(summary.lastSampleAt)));
  });

  it("keeps only the last 100 samples", async () => {
    for (let i = 0; i < 105; i += 1) {
      latencyStore.recordVoiceLatencySample({
        turnId: randomUUID(),
        firstAudioMs: i,
        source: "client",
      });
    }
    const summary = latencyStore.getVoiceLatencySummary();
    assert.equal(summary.count, 100);
    assert.equal(summary.p50Ms, 54);
  });
});

describe("C10 client boundaries (C30)", () => {
  it("VoiceProvider imports contracts only, never the kernel / whisper / memory", () => {
    const source = readFileSync(join(webRoot, "components/voice/VoiceProvider.tsx"), "utf8");
    assert.match(source, /^"use client";/);
    assert.doesNotMatch(source, /@zeref\/jarvis-kernel|@zeref\/zeref-memory|@zeref\/instagram|whisper/);
    assert.match(source, /\/api\/v1\/ops\/voice-latency/);
    assert.match(source, /onPlaying/);
  });
});
