import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, afterEach, before, describe, it } from "node:test";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const testDir = dirname(fileURLToPath(import.meta.url));
const webRoot = join(testDir, "../..");
const repoRoot = join(webRoot, "../..");

const { buildFactCards, FACT_CARD_TOOLS } = await import(
  pathToFileURL(join(webRoot, "lib/jarvis/fact-cards.ts")).href
);
const { runJarvisAgent } = await import(
  pathToFileURL(join(webRoot, "lib/jarvis/agent-runtime.ts")).href
);
const { getCockpitEventBus, resetCockpitEventBusForTests } = await import(
  pathToFileURL(join(webRoot, "lib/cockpit/cockpit-event-bus.ts")).href
);
const { FactCardSchema, FACT_CARD_EVENT } = await import(
  pathToFileURL(join(repoRoot, "packages/contracts/dist/index.js")).href
);
const { resetMemoryAdapterCache } = await import("@zeref/zeref-memory");

const RUN_ID = "22222222-2222-4222-8222-222222222222";

/** Representative tool results (shapes from zeref-context / fixtures). */
const SAMPLE_RESULTS = {
  get_latest_report_headline: {
    available: true,
    headline: "Ride log post shows solid engagement vs account baseline.",
  },
  get_report_artifact: {
    available: true,
    artifactId: "550e8400-e29b-41d4-a716-446655440000",
    report: {
      engagement: { score: 50.738916, vsCohort: "inline" },
      cohort: { label: "account_baseline", sampleSize: 1 },
    },
  },
  memory_search: {
    available: true,
    results: [
      { content: "film the canal ride on Sunday", score: 0.91 },
      { content: "post reels at 7pm", score: 0.42 },
    ],
  },
  vault_list: { available: true, items: [{ content: "post reels at 7pm" }, { content: "use 3 hashtags" }] },
  vault_pin: { available: true, item: { content: "post reels at 7pm" }, alreadyPinned: false },
  get_cockpit_summary: {
    available: true,
    panels: {
      studio: { itemCount: 12 },
      calendar: { itemCount: 3 },
      reports: { itemCount: 1 },
      research: { itemCount: 4 },
    },
  },
  get_pipeline_status: { available: true, status: "idle", message: "pipeline idle — no active jobs" },
  enqueue_job: { queued: true, mocked: true, jobId: "mock-job-1", workerConsuming: false },
};

const SAMPLE_ARGS = { enqueue_job: { jobType: "report" } };

function numbersIn(value, acc = []) {
  if (typeof value === "number" && Number.isFinite(value)) acc.push(value);
  else if (Array.isArray(value)) value.forEach((v) => numbersIn(v, acc));
  else if (value && typeof value === "object") Object.values(value).forEach((v) => numbersIn(v, acc));
  else if (typeof value === "string") {
    for (const m of value.matchAll(/\d+(?:\.\d+)?/g)) acc.push(Number(m[0]));
  }
  return acc;
}

/** A displayed number is grounded if some result number rounds to it at the shown precision. */
function isGrounded(shown, resultNumbers) {
  const decimals = (shown.split(".")[1] ?? "").length;
  return resultNumbers.some((n) => n.toFixed(decimals) === Number(shown).toFixed(decimals));
}

function call(name, result = SAMPLE_RESULTS[name], args = SAMPLE_ARGS[name] ?? {}) {
  return { name, args, result };
}

describe("fact cards builder (CLOUD-C17a)", () => {
  afterEach(() => {
    delete process.env.ZEREF_BFF_FIXTURE;
  });

  it("every whitelisted tool has a sample and yields a schema-valid card", () => {
    for (const tool of FACT_CARD_TOOLS) {
      assert.ok(SAMPLE_RESULTS[tool], `missing sample for ${tool}`);
      const cards = buildFactCards(RUN_ID, [call(tool)]);
      assert.equal(cards.length, 1, tool);
      FactCardSchema.parse(cards[0]);
      assert.equal(cards[0].toolName, tool);
    }
  });

  it("no number on a card that is not in the tool result", () => {
    for (const tool of FACT_CARD_TOOLS) {
      const result = SAMPLE_RESULTS[tool];
      const resultNumbers = numbersIn(result);
      const [card] = buildFactCards(RUN_ID, [call(tool)]);
      for (const text of [card.title, ...card.fields.flatMap((f) => [f.label, f.value, f.unit ?? ""])]) {
        for (const m of text.matchAll(/\d+(?:\.\d+)?/g)) {
          assert.ok(isGrounded(m[0], resultNumbers), `${tool}: "${m[0]}" in "${text}" not in tool result`);
        }
      }
    }
  });

  it("report card shows score, usual and low-confidence baseline", () => {
    const [card] = buildFactCards(RUN_ID, [call("get_report_artifact")]);
    assert.deepEqual(
      card.fields.map((f) => f.value),
      ["50.7", "In line with your usual", "1 post — low confidence"],
    );
  });

  it("unknown, failed and unavailable results produce no card", () => {
    assert.deepEqual(buildFactCards(RUN_ID, [call("vault_forget", { deleted: true, content: "x" })]), []);
    assert.deepEqual(buildFactCards(RUN_ID, [call("not_a_tool", { headline: "x" })]), []);
    assert.deepEqual(buildFactCards(RUN_ID, [call("get_latest_report_headline", { error: "boom" })]), []);
    assert.deepEqual(
      buildFactCards(RUN_ID, [call("get_latest_report_headline", { available: false, message: "none" })]),
      [],
    );
    assert.deepEqual(buildFactCards(RUN_ID, [call("memory_search", { available: true, results: [] })]), []);
  });

  it("badge: SIMULATED for mocked results, FIXTURE in fixture mode, else LIVE", () => {
    assert.equal(buildFactCards(RUN_ID, [call("enqueue_job")])[0].badge, "SIMULATED");
    assert.equal(buildFactCards(RUN_ID, [call("get_pipeline_status")])[0].badge, "LIVE");
    process.env.ZEREF_BFF_FIXTURE = "1";
    assert.equal(buildFactCards(RUN_ID, [call("get_pipeline_status")])[0].badge, "FIXTURE");
    assert.equal(buildFactCards(RUN_ID, [call("enqueue_job")])[0].badge, "SIMULATED");
  });
});

const ENV_KEYS = [
  "ZEREF_PHASE11_AGENT",
  "ZEREF_LLM_MOCK",
  "ZEREF_BFF_FIXTURE",
  "ZEREF_MEMORY_MOCK",
  "ZEREF_JOB_ENQUEUE_MOCK",
];

describe("fact cards from jarvis runs (CLOUD-C17a)", () => {
  before(() => {
    for (const key of ENV_KEYS) process.env[key] = "1";
    delete process.env.DATABASE_URL;
    delete process.env.OPENROUTER_API_KEY;
    resetMemoryAdapterCache();
    resetCockpitEventBusForTests();
  });

  after(() => {
    for (const key of ENV_KEYS) delete process.env[key];
    resetMemoryAdapterCache();
    resetCockpitEventBusForTests();
  });

  function captureCards() {
    const seen = [];
    const unsubscribe = getCockpitEventBus().subscribe((type, data) => {
      if (type === FACT_CARD_EVENT) seen.push(data);
    });
    return { seen, unsubscribe };
  }

  it("headline question returns and broadcasts a FIXTURE card with the headline", async () => {
    const { seen, unsubscribe } = captureCards();
    const result = await runJarvisAgent({
      turnId: randomUUID(),
      transcript: "what is the latest report headline",
    });
    unsubscribe();
    assert.equal(result.factCards.length, 1);
    const [card] = result.factCards;
    assert.equal(card.badge, "FIXTURE");
    assert.equal(card.fields[0].value, "Ride log post shows solid engagement vs account baseline.");
    assert.deepEqual(seen, result.factCards);
  });

  it("no card before a write-high confirm; SIMULATED card after it", async () => {
    const pending = await runJarvisAgent({ turnId: randomUUID(), transcript: "enqueue a report job" });
    assert.equal(pending.terminalReason, "awaiting_confirm");
    assert.deepEqual(pending.factCards, []);

    const confirmed = await runJarvisAgent({
      turnId: randomUUID(),
      transcript: "enqueue a report job",
      confirmed: true,
      runId: pending.runId,
    });
    assert.equal(confirmed.factCards.length, 1);
    assert.equal(confirmed.factCards[0].badge, "SIMULATED");
    assert.equal(confirmed.factCards[0].title, "Job queued");
  });

  it("unrecognised input produces no cards", async () => {
    const result = await runJarvisAgent({ turnId: randomUUID(), transcript: "sing me a sea shanty" });
    assert.deepEqual(result.factCards, []);
  });
});
