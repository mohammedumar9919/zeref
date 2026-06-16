# Zeref — Phase 11 Contract (Agentic JARVIS)

**Phase:** 11  
**Status:** **APPROVED** @ `0072c18` (Lead orchestrator 2026-06-15)  
**Theme:** Agentic JARVIS — portable ReAct core, MCP-style tools, live reads, guarded writes, audit, eval harness. **The kingpiece** before streaming voice polish (Phase 15).

**Prerequisites:** Phase 10.5 **APPROVED** @ `a90af79`; `verify:phase-10.5` green on `main`. Phases 0–10.5 must **remain green**.

**References:** Master plan `zeref_master_plan_ab56bf3f.plan.md` (§6 Phase 11, Pass-4 §10.5) · [phase-10.5-contract.md](./phase-10.5-contract.md) · [ADR-039](./adr/ADR-039-jarvis-core-extraction-mcp-tools.md) · [ADR-040](./adr/ADR-040-agent-loop-budgets-capability-audit.md) · [ADR-041](./adr/ADR-041-jarvis-eval-harness.md) · [failures-checklist.md](../failures-checklist.md)

**Non-goals:** Multi-tenant user auth (Phase 16) · vector memory / G5 (Phase 11.x) · model tiering config UI (G6 — port-ready only) · streaming TTS (Phase 15) · new Instagram collect UI · cockpit visual Tier 3 (Phase 6.2)

---

## Planner decisions (binding)

| # | Decision |
|---|----------|
| **Q1** | **Auth deferred** — Phase 11 is single-operator. Protection = **capability/permission model** (risk tiers + confirm + audit), not login. |
| **Q2** | **ReAct loop** — predict→act→observe→repeat with **hard budgets** (max iterations, tokens, wall-clock) + kill-switch. |
| **Q3** | **Stream-shaped** — emit `agent.step` events so Phase 15 streaming TTS is not a rewrite. |
| **Q4** | **Voice integration** — keep fast ack; slow path in `handle-turn.ts` runs the agent. **Confirmation is conversational** ("shall I schedule it?"). |
| **Q5** | **Portability** — `jarvis-core` modules must not import `@zeref/zeref-memory` or `apps/web`; memory/LLM/tools via **ports**. `@zeref/contracts` (pure Zod) allowed. |
| **Q6** | **Live reads now** — read tools hit live BFF/worker-health; honest degraded mode when DB/worker absent. |
| **Q7** | **`verify:phase-11`** chains **`verify:phase-10.5`**; eval harness **0 unsafe actions** hard-fail. |

---

## Conditions (C141–C162)

### Core agent (P11-A)

| ID | Condition |
|----|-----------|
| **C141** | **ReAct loop** — predict→act→observe→repeat until finish or budget exhausted. |
| **C142** | **Budgets + kill-switch** — max iterations, token budget, wall-clock; abort emits terminal `agent.step`. |
| **C143** | **MCP-style `ToolDescriptor`** — name, description, JSON Schema input, risk tier, idempotency key support, cost hint. |
| **C144** | **Ports** — `LlmPort`, `MemoryPort`, `ToolExecutorPort`; **zero** imports of `@zeref/zeref-memory` or `apps/web` in `packages/jarvis-kernel/src/core/**`. |
| **C145** | **Persona module** — British partner tone + mode detect (study vs ops vs casual); separate from tool routing. |
| **C146** | **Permission / risk tiers** — read / write-low / write-high; `confirmRequired` on destructive writes. |
| **C147** | **Streaming `agent.step` events** — structured steps for cockpit SSE + future TTS chunking. |
| **C148** | **Audit event shape** — every tool invocation produces an auditable record (in-memory in core; persist in P11-C). |

### Contracts + DB (P11-B)

| ID | Condition |
|----|-----------|
| **C149** | **Tool enum fix (N3)** — `JarvisToolNameSchema` lists reads + writes + memory tools (not 3-tool stub). |
| **C150** | **`AgentRun` / `AgentStep` / `ConfirmRequest` schemas** in `@zeref/contracts/phase11`. |
| **C151** | **`JarvisAuditEntry` schema** — tool name, args hash, result summary, risk, timestamp, run id. |
| **C152** | **DB migration** — `jarvis_audit_log` + `jarvis_agent_runs` tables (Drizzle). |

### Tool pack + BFF (P11-C)

| ID | Condition |
|----|-----------|
| **C153** | **Live read adapters** — cockpit slices, report artifact, worker-health (fixture-degraded when absent). |
| **C154** | **Guarded write tools** — `enqueue_job`, `create_calendar_event`, `update_studio_draft`, `create_research_topic` with idempotency keys. |
| **C155** | **Conversational confirm** — agent asks before destructive writes; no new confirm UI worker. |
| **C156** | **Audit persist** — every tool call written to `jarvis_audit_log`. |
| **C157** | **Agent endpoint + `handle-turn` integration** — slow path invokes agent run; fast ack unchanged. |
| **C158** | **Honest degraded mode** — live reads fail closed with explicit message when DB/worker unavailable. |

### QA + eval (P11-D)

| ID | Condition |
|----|-----------|
| **C159** | **`verify:phase-11`** chains **`verify:phase-10.5`**. |
| **C160** | **Eval harness** — human-approved golden tasks; scorer: task-success %, tool-choice accuracy, hallucination checks, **0 unsafe actions** hard-fail. |
| **C161** | **E2E agent flow** — `jarvis-agent-11.spec.ts` (mock LLM). |
| **C162** | **CI step** — budgets enforced under `ZEREF_LLM_MOCK=1`. |

---

## Amendment S — Phase 11 file firewall

### P11-A — jarvis-core (portable agent core)

**Allowed:** `packages/jarvis-kernel/src/core/**`, `packages/jarvis-kernel/test/core/**`

**Forbidden:** `packages/jarvis-kernel/src/tools/**` (legacy), `apps/web/**`, `packages/zeref-memory/**`, `packages/contracts/**`, `scripts/**`

**Deliver:** C141–C148. Tests use **fake ports** — deterministic, no DB.

**Council:** **MANDATORY** — core is the partner substrate.

### P11-B — contracts + DB foundation

**Allowed:** `packages/contracts/src/phase11/**`, `packages/contracts/src/phase6/jarvis-turn.ts` (enum fix only), `fixtures/phase-11/**`, `packages/db/**` (migration)

**Forbidden:** `packages/jarvis-kernel/**`, `apps/web/**`, `scripts/**`

**Deliver:** C149–C152.

**Council:** **MANDATORY** — contract change.

### P11-C — Zeref tool pack + BFF agent runtime

**Allowed:** `packages/jarvis-kernel/src/zeref/**`, `apps/web/lib/jarvis/**`, `apps/web/app/api/v1/jarvis/**`, `apps/web/lib/voice/handle-turn.ts`

**Forbidden:** `packages/contracts/**`, `packages/db/**`, `apps/web/components/**`, `scripts/**`

**Deliver:** C153–C158.

**Council:** **MANDATORY** — write tools + BFF + [failures-checklist.md](../failures-checklist.md).

### P11-D — verify gate + eval harness + CI

**Allowed:** `scripts/verify-phase-11.mjs`, `eval/jarvis/**`, `apps/web/e2e/jarvis-agent-11.spec.ts`, `.github/workflows/ci.yml`, `docs/governance/verify.md`, `package.json` (script)

**Deliver:** C159–C162. Golden set is **human-approved** — do not edit without sign-off.

---

## Spawn waves (binding)

| Wave | Slices | Gate |
|------|--------|------|
| **0** | Lead governance (this contract + ADR-039/040/041 + verify stub) | docs merged |
| **1** | **P11-A** ∥ **P11-B** | `npm test -w @zeref/jarvis-kernel` + contracts/db tests |
| **2** | **P11-C** | agent endpoint + handle-turn integration tests |
| **3** | **P11-D** | `verify:phase-11` green |
| **4** | Lead merge + `CURRENT_STATE` | Phase 11 **APPROVED** |

---

## Exit gate (all required)

1. `npm run verify:phase-10.5` green (no regression)  
2. `npm run verify:phase-11` green  
3. Eval harness: **0 unsafe actions** on golden set  
4. ReAct loop + budgets enforced under mock LLM  
5. Live read tools + guarded writes + audit persist  
6. Conversational confirm before destructive writes  
7. Lead updates `CURRENT_STATE.md` — Phase 11 **APPROVED**

---

## Grounding (current codebase)

| Area | Today | Phase 11 target |
|------|-------|-----------------|
| `process-turn.ts` | Single pass, no loop | ReAct agent run |
| `tools/registry.ts` | Regex routing; fixture JSON reads | MCP-style descriptors + live adapters |
| `JarvisToolNameSchema` | 3 tools (N3 drift) | Full enum C149 |
| `generate-response.ts` | 1-sentence persona | Persona module C145 |
| `handle-turn.ts` | Sync mock turn | Slow path = agent run C157 |
| Kernel deps | `@zeref/zeref-memory` direct | Ports only C144 |

**First verify command (after Wave 1 P11-A):**

```powershell
npm run build -w @zeref/jarvis-kernel
npm test -w @zeref/jarvis-kernel
```

**Full phase gate (after Wave 3, user terminal):**

```powershell
$env:ZEREF_BFF_FIXTURE='1'
$env:ZEREF_PHASE10_OPS='1'
$env:ZEREF_PHASE11_AGENT='1'
$env:ZEREF_JOB_ENQUEUE_MOCK='1'
npm run verify:phase-11
```
