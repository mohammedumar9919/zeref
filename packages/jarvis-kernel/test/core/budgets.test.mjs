import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const pkgRoot = join(dirname(fileURLToPath(import.meta.url)), "../..");
const core = await import(
  pathToFileURL(join(pkgRoot, "dist/core/index.js")).href
);

const {
  DEFAULT_AGENT_BUDGETS,
  mergeBudgets,
  isBudgetExhausted,
  budgetExhaustionReason,
} = core;

describe("@zeref/jarvis-kernel core budgets", () => {
  it("exposes ADR-040 default limits", () => {
    assert.equal(DEFAULT_AGENT_BUDGETS.maxIterations, 8);
    assert.equal(DEFAULT_AGENT_BUDGETS.wallClockMs, 30_000);
    assert.equal(DEFAULT_AGENT_BUDGETS.tokenBudget, 100_000);
  });

  it("mergeBudgets overlays partial config", () => {
    const merged = mergeBudgets({ maxIterations: 3 });
    assert.equal(merged.maxIterations, 3);
    assert.equal(merged.wallClockMs, 30_000);
  });

  it("detects iteration exhaustion", () => {
    const budgets = mergeBudgets({ maxIterations: 2 });
    assert.equal(
      isBudgetExhausted({ iteration: 2, elapsedMs: 0, tokensUsed: 0 }, budgets),
      true,
    );
    assert.equal(
      budgetExhaustionReason({ iteration: 2, elapsedMs: 0, tokensUsed: 0 }, budgets),
      "max_iterations",
    );
  });

  it("detects wall-clock exhaustion", () => {
    const budgets = mergeBudgets({ wallClockMs: 100 });
    const state = { iteration: 0, elapsedMs: 150, tokensUsed: 0 };
    assert.equal(isBudgetExhausted(state, budgets), true);
    assert.equal(budgetExhaustionReason(state, budgets), "wall_clock");
  });

  it("detects token budget exhaustion", () => {
    const budgets = mergeBudgets({ tokenBudget: 500 });
    const state = { iteration: 0, elapsedMs: 0, tokensUsed: 600 };
    assert.equal(isBudgetExhausted(state, budgets), true);
    assert.equal(budgetExhaustionReason(state, budgets), "token_budget");
  });

  it("returns false when within all budgets", () => {
    const state = { iteration: 1, elapsedMs: 1000, tokensUsed: 50 };
    assert.equal(isBudgetExhausted(state, DEFAULT_AGENT_BUDGETS), false);
    assert.equal(budgetExhaustionReason(state, DEFAULT_AGENT_BUDGETS), null);
  });
});
