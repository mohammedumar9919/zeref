import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

const pkgRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = join(pkgRoot, "../..");
const goldenPath = join(repoRoot, "fixtures/phase-4/elite/ride-log-elite.golden.json");

const built = await import(pathToFileURL(join(pkgRoot, "dist/index.js")).href);
const contracts = await import(
  pathToFileURL(join(repoRoot, "packages/contracts/dist/index.js")).href,
);

const { buildEliteReport, lintNarrativeCitations } = built;
const { EliteReportSchema } = contracts;

const golden = JSON.parse(readFileSync(goldenPath, "utf8"));

describe("@zeref/reports elite", () => {
  it("buildEliteReport matches golden shape for ride-log", () => {
    const report = buildEliteReport({
      platformAccountId: golden.accountRef.platformAccountId,
      periodStart: golden.period.start,
      periodEnd: golden.period.end,
      analysis: {
        schemaVersion: "4.0.0",
        engagementScore: golden.engagement.score,
        nicheTags: golden.niche.pillars,
        insufficientData: false,
        cohortLabel: golden.cohort.label,
        cohortSampleSize: golden.cohort.sampleSize,
        followerCount: 1000,
      },
      metricFacts: [
        {
          id: golden.engagement.citations[0].metricFactId,
          engagementScore: String(golden.engagement.score),
          insufficientData: false,
        },
      ],
      narrativeMarkdown: golden.narrative.markdown,
    });

    assert.equal(report.schemaVersion, "phase4-elite-v1");
    assert.equal(report.engagement.score, golden.engagement.score);
    const lint = lintNarrativeCitations(report.narrative.markdown, report.narrative.citationIndex);
    assert.equal(lint.ok, true);
    EliteReportSchema.parse(report);
  });
});
