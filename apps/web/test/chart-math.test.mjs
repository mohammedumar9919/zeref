import assert from "node:assert/strict";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

const webRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const chartMath = await import(
  pathToFileURL(join(webRoot, "components/reports/chart-math.ts")).href
);

const BOX = { width: 100, height: 60, padding: 10 };

describe("chart-math (CLOUD-C6)", () => {
  it("median handles odd, even and empty series", () => {
    assert.equal(chartMath.median([3, 1, 2]), 2);
    assert.equal(chartMath.median([1, 2, 3, 4]), 2.5);
    assert.equal(chartMath.median([]), null);
  });

  it("scaleSeries maps min to the bottom and max to the top inside padding", () => {
    const pts = chartMath.scaleSeries([5, 10, 0], BOX);
    assert.equal(pts[0].x, 10);
    assert.equal(pts[2].x, 90);
    assert.equal(pts[1].y, 10);
    assert.equal(pts[2].y, 50);
  });

  it("a flat series sits on the vertical middle", () => {
    const pts = chartMath.scaleSeries([7, 7, 7], BOX);
    assert.ok(pts.every((p) => p.y === 30));
    assert.equal(chartMath.scaleValue(7, [7, 7, 7], BOX), 30);
  });

  it("scaleValue matches the series scale", () => {
    assert.equal(chartMath.scaleValue(5, [0, 10], BOX), 30);
  });
});
