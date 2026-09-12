import assert from "node:assert/strict";
import { dirname, join } from "node:path";
import { after, before, describe, it } from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

const testDir = dirname(fileURLToPath(import.meta.url));
const built = await import(pathToFileURL(join(testDir, "../dist/index.js")).href);
const { scoreCaptionHook, buildWeeklyBrief } = built;

describe("caption hook score (ZEREF_LLM_MOCK)", () => {
  const previousMock = process.env.ZEREF_LLM_MOCK;
  const previousKey = process.env.OPENROUTER_API_KEY;

  before(() => {
    process.env.ZEREF_LLM_MOCK = "1";
    delete process.env.OPENROUTER_API_KEY;
  });

  after(() => {
    if (previousMock === undefined) delete process.env.ZEREF_LLM_MOCK;
    else process.env.ZEREF_LLM_MOCK = previousMock;
    if (previousKey === undefined) delete process.env.OPENROUTER_API_KEY;
    else process.env.OPENROUTER_API_KEY = previousKey;
  });

  it("returns a 0–10 mocked hook score for a punchy caption", async () => {
    const result = await scoreCaptionHook("3am. Engine on. No talking — just the ridge.");
    assert.equal(result.mocked, true);
    assert.ok(result.score >= 0 && result.score <= 10);
    assert.ok(result.score >= 6);
    assert.match(result.rationale, /hook/i);
  });

  it("scores a weak caption lower than a punchy one", async () => {
    const punchy = await scoreCaptionHook("3am. Engine on. No talking — just the ridge.");
    const weak = await scoreCaptionHook("hi");
    assert.ok(weak.score < punchy.score);
  });
});

describe("grounded weekly brief", () => {
  it("cites outlier shortcodes and stays readable under mock", async () => {
    process.env.ZEREF_LLM_MOCK = "1";
    delete process.env.OPENROUTER_API_KEY;
    const brief = await buildWeeklyBrief({
      topicTitle: "Ride log engagement trends",
      outliers: [
        {
          factId: "990e8400-e29b-41d4-a716-446655440004",
          normalizedEntityId: "550e8400-e29b-41d4-a716-446655440001",
          value: 600,
          median: 110,
          multiplier: 5.45,
          shortcode: "HIT999",
          caption: "Night ride — 5am start, no edits.",
        },
      ],
      hooks: [
        {
          caption: "Night ride — 5am start, no edits.",
          score: 8,
          mocked: true,
          rationale: "Specific time + outcome hook.",
        },
      ],
    });
    assert.equal(brief.mocked, true);
    assert.match(brief.text, /HIT999/);
    assert.match(brief.text, /5(\.|\u00d7|x)/i);
    assert.ok(brief.groundedIn.includes("HIT999"));
    assert.ok(brief.text.length > 40);
  });
});
