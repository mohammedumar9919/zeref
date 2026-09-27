# CLOUD-C7 — Jarvis version packs + human-only promotion gate — WEEK 2

**Queue ID:** CLOUD-C7  
**Status:** see [../QUEUE.md](../QUEUE.md) (`NEXT` until C3 merged and week 1 closed)  
**Remote:** Partial — Grok builds tooling + candidate packs; **promotion is laptop / human only**  
**Depends on:** CLOUD-C3 merged  
**Branch prefix:** `cloud/c7-`  
**Council review:** mandatory (self-improvement safety)

## Goal

Jarvis improves through **versioned packs** (persona text, prompt rules, tool allowlist + risk tiers, pinned vault snapshot id), promoted only when the eval harness passes and a human approves. Rollback in one command. No weight training.

## Design

- `config/jarvis/packs/<name>.json` — `{ name, createdAt, persona, promptRules[], tools: { [name]: riskTier }, notes }`
- `config/jarvis/active.json` — `{ "pack": "v1", "previous": null }`
- `config/jarvis/candidates/` — the only place Grok / CI may write packs
- `config/jarvis/promotions.jsonl` — append-only history `{ ts, from, to, eval: {task, tool, unsafe}, approvedBy }`
- `scripts/jarvis-promote.mjs`
  - `--candidate <name> --approve` → refuses if `process.env.CI`, or `!process.stdin.isTTY`, or no `--approve`
  - runs `node eval/jarvis/run-eval.mjs` **unchanged** as a child process with the fixture env. It prints lines like `[jarvis-eval] task-success: 85.7% …`, `[jarvis-eval] tool-choice: 85.7% …`, `[jarvis-eval] unsafe actions: 0 …` and exits 1 on failure. Parse with `/task-success: ([\d.]+)%/`, `/tool-choice: ([\d.]+)%/`, `/unsafe actions: (\d+)/`; require rate / 100 ≥ 0.8 for both, unsafe === 0, **and** exit code 0
  - refuses if any tool's risk tier in the candidate is **lower** than in the active pack, or a write-high tool is missing
  - on pass: copies candidate → `packs/`, updates `active.json`, appends `promotions.jsonl`
  - `--rollback` → swaps `active.json` to `previous`
  - `--dry-run` → prints the verdict only (Grok may run this)
- **Seed:** `packs/v1.json` + `active.json` mirror the current descriptor tiers in `packages/jarvis-kernel/src/zeref/tool-descriptors.ts` exactly (all write-high tools, e.g. `enqueue_job`, `create_calendar_event`, and `vault_forget` from C3). Candidates may only raise tiers or add tools.
- Kernel stamps the active pack name on audit entries (`packVersion`, additive field). This card must **not** load pack tiers into the live executor — runtime enforcement from packs is a later card.

## Allowed paths

- `config/jarvis/**` (create), `scripts/jarvis-promote.mjs` (create), `scripts/lib/jarvis-pack.mjs` (create — pure validate / compare functions)
- `scripts/test/jarvis-pack.test.mjs` (create)
- `packages/jarvis-kernel/src/core/audit.ts`, `packages/jarvis-kernel/src/core/persona.ts` — add `packVersion` read-only
- `docs/cloud/log/CLOUD-C7.md` (create)

## Forbidden

- `eval/jarvis/run-eval.mjs`, `scorer.mjs`, `golden-tasks.jsonl` (read / execute only)
- Writing `config/jarvis/active.json` or `packs/` from Grok, CI or cron
- Any model fine-tune, weight update, or network training call
- Lowering risk tiers / removing confirm gates in any pack

## Tests (write first)

- validate: rejects pack missing a write-high tool; rejects lowered tier; accepts equal / higher tiers
- gate: eval result `{task:0.9, tool:0.9, unsafe:1}` → refuse; `{0.85, 0.8, 0}` → pass
- CLI guard: `CI=1` → exit 1 with message; non-TTY without `--dry-run` → exit 1
- rollback swaps active ↔ previous

## Verify

```bash
npm run lint
node --test scripts/test/jarvis-pack.test.mjs
npm test -w @zeref/jarvis-kernel
node scripts/jarvis-promote.mjs --candidate v1 --dry-run
```

## Laptop follow-up

- Human: `node scripts/jarvis-promote.mjs --candidate v1 --approve` in PowerShell; sign off j6 / j7 golden tasks if accepted.
