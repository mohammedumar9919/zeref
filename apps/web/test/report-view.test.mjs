import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

const webRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = join(webRoot, "../..");

const elite = JSON.parse(
  readFileSync(join(repoRoot, "fixtures/phase-4/elite/ride-log-elite.golden.json"), "utf8"),
);

const reportView = await import(
  pathToFileURL(join(webRoot, "components/reports/report-view.ts")).href
);

function withEngagement(overrides, cohort) {
  return {
    ...elite,
    engagement: { ...elite.engagement, ...overrides },
    ...(cohort === undefined ? {} : { cohort }),
  };
}

describe("report honesty (CLOUD-D1)", () => {
  it("shows vsCohort as words, never as a numeric bar", () => {
    const [engagement] = reportView.buildReportCharts(withEngagement({ vsCohort: "inline" }));
    assert.equal(engagement.comparison.label, "In line with your usual");
    assert.ok(engagement.bars.every((bar) => !/^vs /.test(bar.label)));
  });

  it("maps each cohort category and falls back to not enough history", () => {
    assert.equal(reportView.describeVsCohort("above"), "Above your usual");
    assert.equal(reportView.describeVsCohort("below"), "Below your usual");
    assert.equal(reportView.describeVsCohort("unknown"), "Not enough history");
    assert.equal(reportView.describeVsCohort("something-new"), "Not enough history");
  });

  it("flags a small baseline as low confidence", () => {
    const low = reportView.buildComparison(
      withEngagement({ vsCohort: "above" }, { label: "ride log", sampleSize: 1 }),
    );
    assert.equal(low.baseline, "vs 1 post — low confidence");
    assert.equal(low.lowConfidence, true);

    const ok = reportView.buildComparison(
      withEngagement({ vsCohort: "above" }, { label: "ride log", sampleSize: 12 }),
    );
    assert.equal(ok.baseline, "vs 12 posts");
    assert.equal(ok.lowConfidence, false);
  });

  it("omits the baseline when the report has no cohort size", () => {
    const { cohort: _drop, ...noCohort } = elite;
    const comparison = reportView.buildComparison(noCohort);
    assert.equal(comparison.baseline, undefined);
  });

  it("drops the score bar instead of inventing 0 when score is missing", () => {
    const [engagement] = reportView.buildReportCharts(withEngagement({ score: null }));
    assert.equal(engagement.bars.length, 0);
  });

  it("titles citations as a count with readable labels", () => {
    const citations = reportView
      .buildReportCharts(elite)
      .find((chart) => chart.id === "citations");
    assert.equal(citations.title, `Facts cited: ${elite.narrative.citationIndex.length}`);
    for (const bar of citations.bars) {
      assert.doesNotMatch(bar.label, /^c\d+$/i);
    }
  });
});
