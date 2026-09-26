import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const pkgRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const core = await import(pathToFileURL(join(pkgRoot, "dist/core/index.js")).href);

const { britishPartnerSystemPrompt } = core;

describe("persona steering (CLOUD-B3)", () => {
  it("steers named competitor to discover_competitor not own outliers", () => {
    const prompt = britishPartnerSystemPrompt("ops");
    assert.match(prompt, /discover_competitor/);
    assert.match(prompt, /@handle|named Instagram/i);
    assert.match(prompt, /get_research_outliers/);
    assert.match(prompt, /other creators/i);
  });

  it("steers viral reel asks to suggest_reel_ideas / research_external_trends", () => {
    const prompt = britishPartnerSystemPrompt("ops");
    assert.match(prompt, /suggest_reel_ideas/);
    assert.match(prompt, /research_external_trends/);
    assert.match(prompt, /5× outliers|5x outliers|empty own-account/i);
  });

  it("does not claim Insights are impossible and does not claim BD on Instagram Login", () => {
    const prompt = britishPartnerSystemPrompt("ops");
    assert.match(prompt, /get_instagram_insights/);
    assert.match(prompt, /graph\.facebook\.com/);
    assert.match(prompt, /FACEBOOK_\*/);
    assert.match(prompt, /Never tell the operator Insights are impossible/i);
    assert.doesNotMatch(prompt, /Business Discovery works on graph\.instagram\.com/);
  });

  it("steers vague competitors to ask for @handle and viral prediction honesty", () => {
    const prompt = britishPartnerSystemPrompt("ops");
    assert.match(prompt, /ask for one public Business\/Creator username/i);
    assert.match(prompt, /Will this post go viral|no Meta viral predictor/i);
    assert.match(prompt, /request_performance_report \(write-low\)/);
    assert.match(prompt, /enqueue_job is write-high/i);
  });

  it("steers multi-turn voice follow-ups to continue offers", () => {
    const prompt = britishPartnerSystemPrompt("ops");
    assert.match(prompt, /Multi-turn voice/i);
    assert.match(prompt, /how can I assist/i);
    assert.match(prompt, /their\/them\/that/i);
  });
});
