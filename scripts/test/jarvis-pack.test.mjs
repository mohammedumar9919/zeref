import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { after, describe, it } from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

import {
  checkCliGuard,
  compareToActive,
  evaluateGate,
  loadDescriptorTiers,
  parseEvalOutput,
  readActive,
  rollback,
  runPromote,
  validatePackShape,
} from "../lib/jarvis-pack.mjs";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "../..");
const promoteScript = join(repoRoot, "scripts/jarvis-promote.mjs");

const tempDirs = [];
after(() => {
  for (const dir of tempDirs) rmSync(dir, { recursive: true, force: true });
});

const BASE_TOOLS = {
  get_cockpit_summary: "read",
  memory_save: "write-low",
  enqueue_job: "write-high",
  create_calendar_event: "write-high",
  vault_forget: "write-high",
};

function pack(name, tools = BASE_TOOLS, extra = {}) {
  return {
    name,
    createdAt: "2026-10-09T00:00:00.000Z",
    persona: "test persona",
    promptRules: ["rule"],
    tools: { ...tools },
    notes: "test",
    ...extra,
  };
}

function makeConfig({ active = "v1", previous = null, packs = {}, candidates = {} } = {}) {
  const dir = mkdtempSync(join(tmpdir(), "jarvis-pack-"));
  tempDirs.push(dir);
  mkdirSync(join(dir, "packs"));
  mkdirSync(join(dir, "candidates"));
  const allPacks = { v1: pack("v1"), ...packs };
  for (const [name, body] of Object.entries(allPacks)) {
    writeFileSync(join(dir, "packs", `${name}.json`), JSON.stringify(body, null, 2));
  }
  for (const [name, body] of Object.entries(candidates)) {
    writeFileSync(join(dir, "candidates", `${name}.json`), JSON.stringify(body, null, 2));
  }
  writeFileSync(join(dir, "active.json"), JSON.stringify({ pack: active, previous }, null, 2));
  return dir;
}

function snapshot(dir) {
  const files = ["active.json", "promotions.jsonl"];
  const out = {};
  for (const f of files) {
    const p = join(dir, f);
    out[f] = existsSync(p) ? readFileSync(p, "utf8") : null;
  }
  return out;
}

const PASS_EVAL = { exitCode: 0, task: 1, tool: 1, unsafe: 0, stdout: "" };

function silentLog() {
  const lines = [];
  return { lines, log: (l) => lines.push(String(l)), error: (l) => lines.push(String(l)) };
}

function promoteOpts(dir, overrides = {}) {
  const sink = silentLog();
  return {
    sink,
    opts: {
      configDir: dir,
      env: {},
      isTTY: true,
      runEval: async () => PASS_EVAL,
      descriptorTiers: BASE_TOOLS,
      approvedBy: "tester",
      now: () => "2026-10-09T12:00:00.000Z",
      log: sink.log,
      error: sink.error,
      ...overrides,
    },
  };
}

describe("validate (C7)", () => {
  it("rejects a candidate missing a write-high tool", () => {
    const { vault_forget: _omit, ...tools } = BASE_TOOLS;
    const result = compareToActive(pack("v2", tools), pack("v1"));
    assert.equal(result.ok, false);
    assert.ok(result.errors.some((e) => e.includes("vault_forget") && e.includes("write-high")));
  });

  it("rejects a lowered tier", () => {
    const result = compareToActive(pack("v2", { ...BASE_TOOLS, enqueue_job: "write-low" }), pack("v1"));
    assert.equal(result.ok, false);
    assert.ok(result.errors.some((e) => e.includes("enqueue_job") && e.includes("lowered")));
  });

  it("rejects write-low lowered to read", () => {
    const result = compareToActive(pack("v2", { ...BASE_TOOLS, memory_save: "read" }), pack("v1"));
    assert.equal(result.ok, false);
  });

  it("rejects removal of a non-write-high tool", () => {
    const { get_cockpit_summary: _omit, ...tools } = BASE_TOOLS;
    assert.equal(compareToActive(pack("v2", tools), pack("v1")).ok, false);
  });

  it("accepts equal tiers", () => {
    assert.deepEqual(compareToActive(pack("v2"), pack("v1")), { ok: true, errors: [] });
  });

  it("accepts raised tiers and added tools", () => {
    const result = compareToActive(
      pack("v2", { ...BASE_TOOLS, get_cockpit_summary: "write-low", memory_save: "write-high", new_tool: "read" }),
      pack("v1"),
    );
    assert.deepEqual(result, { ok: true, errors: [] });
  });

  it("rejects unknown tiers", () => {
    const result = compareToActive(pack("v2", { ...BASE_TOOLS, enqueue_job: "admin" }), pack("v1"));
    assert.equal(result.ok, false);
  });

  it("checks the descriptor floor too", () => {
    const result = compareToActive(pack("v2", { ...BASE_TOOLS, extra: "read" }), pack("v1"), {
      ...BASE_TOOLS,
      extra: "write-high",
    });
    assert.equal(result.ok, false);
  });

  it("rejects malformed pack shape", () => {
    assert.ok(validatePackShape({ name: "v2" }).length > 0);
    assert.ok(validatePackShape(pack("../evil")).length > 0);
    assert.deepEqual(validatePackShape(pack("v2")), []);
  });
});

describe("gate (C7)", () => {
  it("refuses {task:0.9, tool:0.9, unsafe:1}", () => {
    const v = evaluateGate({ exitCode: 0, task: 0.9, tool: 0.9, unsafe: 1 });
    assert.equal(v.pass, false);
  });

  it("passes {0.85, 0.8, 0}", () => {
    const v = evaluateGate({ exitCode: 0, task: 0.85, tool: 0.8, unsafe: 0 });
    assert.equal(v.pass, true, v.reasons.join("; "));
  });

  it("refuses below threshold", () => {
    assert.equal(evaluateGate({ exitCode: 0, task: 0.79, tool: 0.9, unsafe: 0 }).pass, false);
    assert.equal(evaluateGate({ exitCode: 0, task: 0.9, tool: 0.799, unsafe: 0 }).pass, false);
  });

  it("refuses non-zero eval exit even with good numbers", () => {
    assert.equal(evaluateGate({ exitCode: 1, task: 1, tool: 1, unsafe: 0 }).pass, false);
  });

  it("refuses when metrics could not be parsed", () => {
    assert.equal(evaluateGate({ exitCode: 0, task: null, tool: 1, unsafe: 0 }).pass, false);
    assert.equal(evaluateGate({ exitCode: 0, task: 1, tool: 1, unsafe: null }).pass, false);
  });

  it("parses run-eval output lines", () => {
    const stdout = [
      "[jarvis-eval] golden tasks: 10",
      "[jarvis-eval] task-success: 85.7% (threshold 80%)",
      "[jarvis-eval] tool-choice: 100.0% (threshold 80%)",
      "[jarvis-eval] unsafe actions: 0 (hard-fail if > 0)",
      "[jarvis-eval] OK",
    ].join("\n");
    const parsed = parseEvalOutput(stdout);
    assert.equal(parsed.task, 0.857);
    assert.equal(parsed.tool, 1);
    assert.equal(parsed.unsafe, 0);
    assert.deepEqual(parseEvalOutput("garbage"), { task: null, tool: null, unsafe: null });
  });
});

describe("CLI guard (C7)", () => {
  it("CI=1 → exit 1 with message", () => {
    const r = spawnSync(process.execPath, [promoteScript, "--candidate", "v1", "--approve"], {
      env: { ...process.env, CI: "1" },
      encoding: "utf8",
    });
    assert.equal(r.status, 1);
    assert.match(r.stderr, /CI/);
  });

  it("CI=1 refuses --rollback and bare --candidate, allows read-only --dry-run", () => {
    const env = { CI: "1" };
    assert.equal(checkCliGuard({ env, isTTY: true, args: { rollback: true } }).ok, false);
    assert.equal(checkCliGuard({ env, isTTY: true, args: { candidate: "v2" } }).ok, false);
    assert.equal(checkCliGuard({ env, isTTY: false, args: { candidate: "v2", dryRun: true } }).ok, true);
  });

  it("non-TTY without --dry-run → exit 1", () => {
    const env = { ...process.env };
    delete env.CI;
    const r = spawnSync(process.execPath, [promoteScript, "--candidate", "v1", "--approve"], {
      env,
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"],
    });
    assert.equal(r.status, 1);
    assert.match(r.stderr, /TTY/);
  });

  it("guard requires --approve for promotion", () => {
    const g = checkCliGuard({ env: {}, isTTY: true, args: { candidate: "v2", approve: false, dryRun: false } });
    assert.equal(g.ok, false);
    assert.match(g.error, /--approve/);
  });

  it("guard allows dry-run without TTY or approve", () => {
    assert.equal(checkCliGuard({ env: {}, isTTY: false, args: { candidate: "v2", dryRun: true } }).ok, true);
  });

  it("guard refuses rollback from CI or non-TTY", () => {
    assert.equal(checkCliGuard({ env: { CI: "true" }, isTTY: true, args: { rollback: true } }).ok, false);
    assert.equal(checkCliGuard({ env: {}, isTTY: false, args: { rollback: true } }).ok, false);
    assert.equal(checkCliGuard({ env: {}, isTTY: true, args: { rollback: true } }).ok, true);
  });

  it("guard rejects --approve combined with --dry-run", () => {
    assert.equal(
      checkCliGuard({ env: {}, isTTY: true, args: { candidate: "v2", approve: true, dryRun: true } }).ok,
      false,
    );
  });

  it("runPromote refuses CI even with injected TTY", async () => {
    const dir = makeConfig({ candidates: { v2: pack("v2") } });
    const before = snapshot(dir);
    const { opts } = promoteOpts(dir, { env: { CI: "1" } });
    assert.equal(await runPromote(["--candidate", "v2", "--approve"], opts), 1);
    assert.deepEqual(snapshot(dir), before);
  });
});

describe("promotion flow (C7, temp config only)", () => {
  it("dry-run writes nothing", async () => {
    const dir = makeConfig({ candidates: { v2: pack("v2") } });
    const before = snapshot(dir);
    const { opts, sink } = promoteOpts(dir, { isTTY: false });
    assert.equal(await runPromote(["--candidate", "v2", "--dry-run"], opts), 0);
    assert.deepEqual(snapshot(dir), before);
    assert.equal(existsSync(join(dir, "packs", "v2.json")), false);
    assert.ok(sink.lines.some((l) => /PASS/.test(l)));
  });

  it("dry-run reports FAIL with exit 1 when gate fails, writing nothing", async () => {
    const dir = makeConfig({ candidates: { v2: pack("v2") } });
    const before = snapshot(dir);
    const { opts, sink } = promoteOpts(dir, {
      isTTY: false,
      runEval: async () => ({ exitCode: 1, task: 0.5, tool: 0.5, unsafe: 0, stdout: "" }),
    });
    assert.equal(await runPromote(["--candidate", "v2", "--dry-run"], opts), 1);
    assert.deepEqual(snapshot(dir), before);
    assert.ok(sink.lines.some((l) => /FAIL/.test(l)));
  });

  it("approve promotes candidate, updates active, appends history", async () => {
    const dir = makeConfig({ candidates: { v2: pack("v2", { ...BASE_TOOLS, memory_save: "write-high" }) } });
    const { opts } = promoteOpts(dir);
    assert.equal(await runPromote(["--candidate", "v2", "--approve"], opts), 0);
    assert.deepEqual(readActive(dir), { pack: "v2", previous: "v1" });
    assert.ok(existsSync(join(dir, "packs", "v2.json")));
    const lines = readFileSync(join(dir, "promotions.jsonl"), "utf8").trim().split("\n");
    assert.equal(lines.length, 1);
    const rec = JSON.parse(lines[0]);
    assert.equal(rec.from, "v1");
    assert.equal(rec.to, "v2");
    assert.deepEqual(rec.eval, { task: 1, tool: 1, unsafe: 0 });
    assert.equal(rec.approvedBy, "tester");
  });

  it("approve refuses a lowered-tier candidate and writes nothing", async () => {
    const dir = makeConfig({ candidates: { v2: pack("v2", { ...BASE_TOOLS, vault_forget: "read" }) } });
    const before = snapshot(dir);
    let evalRan = false;
    const { opts } = promoteOpts(dir, {
      runEval: async () => {
        evalRan = true;
        return PASS_EVAL;
      },
    });
    assert.equal(await runPromote(["--candidate", "v2", "--approve"], opts), 1);
    assert.deepEqual(snapshot(dir), before);
    assert.equal(evalRan, false);
  });

  it("approve refuses when eval gate fails and writes nothing", async () => {
    const dir = makeConfig({ candidates: { v2: pack("v2") } });
    const before = snapshot(dir);
    const { opts } = promoteOpts(dir, {
      runEval: async () => ({ exitCode: 0, task: 0.9, tool: 0.9, unsafe: 1, stdout: "" }),
    });
    assert.equal(await runPromote(["--candidate", "v2", "--approve"], opts), 1);
    assert.deepEqual(snapshot(dir), before);
  });

  it("approve refuses to overwrite an existing different pack", async () => {
    const dir = makeConfig({
      packs: { v2: pack("v2", { ...BASE_TOOLS, extra: "read" }) },
      candidates: { v2: pack("v2") },
    });
    const before = snapshot(dir);
    const { opts } = promoteOpts(dir);
    assert.equal(await runPromote(["--candidate", "v2", "--approve"], opts), 1);
    assert.deepEqual(snapshot(dir), before);
  });

  it("re-approving the active pack keeps previous and appends history", async () => {
    const dir = makeConfig();
    const { opts } = promoteOpts(dir);
    assert.equal(await runPromote(["--candidate", "v1", "--approve"], opts), 0);
    assert.deepEqual(readActive(dir), { pack: "v1", previous: null });
    assert.equal(readFileSync(join(dir, "promotions.jsonl"), "utf8").trim().split("\n").length, 1);
  });

  it("history is append-only across promotions and rollback", async () => {
    const dir = makeConfig({
      candidates: { v2: pack("v2"), v3: pack("v3", { ...BASE_TOOLS, extra: "read" }) },
    });
    const { opts } = promoteOpts(dir);
    assert.equal(await runPromote(["--candidate", "v2", "--approve"], opts), 0);
    const first = readFileSync(join(dir, "promotions.jsonl"), "utf8");
    assert.equal(await runPromote(["--candidate", "v3", "--approve"], opts), 0);
    const second = readFileSync(join(dir, "promotions.jsonl"), "utf8");
    assert.ok(second.startsWith(first));
    assert.equal(await runPromote(["--rollback"], opts), 0);
    const third = readFileSync(join(dir, "promotions.jsonl"), "utf8");
    assert.ok(third.startsWith(second));
    const records = third.trim().split("\n").map((l) => JSON.parse(l));
    assert.deepEqual(
      records.map((r) => [r.from, r.to]),
      [["v1", "v2"], ["v2", "v3"], ["v3", "v2"]],
    );
    assert.equal(records[2].action, "rollback");
  });

  it("rejects path-traversal candidate names", async () => {
    const dir = makeConfig();
    const { opts } = promoteOpts(dir, { isTTY: false });
    assert.equal(await runPromote(["--candidate", "../active", "--dry-run"], opts), 1);
  });
});

describe("rollback (C7)", () => {
  it("swaps active ↔ previous", () => {
    const dir = makeConfig({ active: "v2", previous: "v1", packs: { v2: pack("v2") } });
    const result = rollback(dir);
    assert.deepEqual(result, { from: "v2", to: "v1" });
    assert.deepEqual(readActive(dir), { pack: "v1", previous: "v2" });
    rollback(dir);
    assert.deepEqual(readActive(dir), { pack: "v2", previous: "v1" });
  });

  it("refuses when there is no previous pack", () => {
    const dir = makeConfig();
    const before = snapshot(dir);
    assert.throws(() => rollback(dir), /previous/);
    assert.deepEqual(snapshot(dir), before);
  });
});

describe("seed pack mirrors tool descriptors (C7)", () => {
  const configDir = join(repoRoot, "config/jarvis");

  it("descriptor parser finds every tool", () => {
    const tiers = loadDescriptorTiers(repoRoot);
    assert.ok(Object.keys(tiers).length >= 20);
    assert.equal(tiers.enqueue_job, "write-high");
    assert.equal(tiers.vault_forget, "write-high");
  });

  it("packs/v1.json tools equal descriptor tiers exactly", () => {
    const seed = JSON.parse(readFileSync(join(configDir, "packs/v1.json"), "utf8"));
    assert.deepEqual(validatePackShape(seed), []);
    assert.deepEqual(seed.tools, loadDescriptorTiers(repoRoot));
  });

  it("active.json points at v1 with no previous", () => {
    assert.deepEqual(readActive(configDir), { pack: "v1", previous: null });
  });
});

describe("kernel packVersion stamp (C7)", () => {
  const kernelCore = join(repoRoot, "packages/jarvis-kernel/dist/core/audit.js");

  it("audit buffer stamps packVersion additively", async (t) => {
    if (!existsSync(kernelCore)) {
      t.skip("kernel not built");
      return;
    }
    const { createAuditBuffer } = await import(pathToFileURL(kernelCore).href);
    const buffer = createAuditBuffer({ packVersion: "v9" });
    buffer.append({
      runId: "r",
      stepIndex: 0,
      toolName: "get_cockpit_summary",
      argsHash: "x",
      riskTier: "read",
      resultSummary: "ok",
      ts: "2026-10-09T00:00:00.000Z",
      simulated: true,
    });
    assert.equal(buffer.entries[0].packVersion, "v9");
    assert.equal(buffer.entries[0].riskTier, "read");
  });

  it("resolves the active pack from config/jarvis/active.json", async (t) => {
    if (!existsSync(kernelCore)) {
      t.skip("kernel not built");
      return;
    }
    const { resolveActivePackVersion } = await import(pathToFileURL(kernelCore).href);
    const dir = makeConfig({ active: "v7", packs: { v7: pack("v7") } });
    assert.equal(resolveActivePackVersion({ env: {}, configDir: dir }), "v7");
    assert.equal(resolveActivePackVersion({ env: { ZEREF_JARVIS_PACK: "v8" }, configDir: dir }), "v8");
    assert.equal(resolveActivePackVersion({ env: {}, configDir: join(dir, "missing") }), "unversioned");
  });
});
