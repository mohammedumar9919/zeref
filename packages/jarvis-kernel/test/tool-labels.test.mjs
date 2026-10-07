import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { confirmPrompt, toolLabel, ZEREF_TOOL_DESCRIPTORS } from "../dist/index.js";

describe("tool labels (CLOUD-D2)", () => {
  it("enqueue_job names the job type", () => {
    assert.equal(toolLabel("enqueue_job", { jobType: "report" }), "queue a report job");
    assert.equal(toolLabel("enqueue_job"), "queue a background job");
  });

  it("confirm prompt is plain English", () => {
    assert.equal(
      confirmPrompt("enqueue_job", { jobType: "report" }),
      "Shall I queue a report job? Say yes to confirm.",
    );
  });

  it("every gated tool has a label without underscores", () => {
    for (const tool of ZEREF_TOOL_DESCRIPTORS.filter((t) => t.riskTier !== "read")) {
      assert.doesNotMatch(toolLabel(tool.name, {}), /_/, tool.name);
    }
  });
});
