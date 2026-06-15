# ADR-040: Agent loop, budgets, capability model, and audit (Phase 11)

**Status:** **PROPOSED** (Lead 2026-06-15)  
**Date:** 2026-06-15  
**Owner:** P11-A + P11-C  
**Related:** [phase-11-contract.md](../phase-11-contract.md) C141–C142, C146–C148, C155–C156 · [ADR-039](./ADR-039-jarvis-core-extraction-mcp-tools.md)

---

## Context

Phase 6 voice turns are **one LLM call + optional tool**. Phase 11 requires multi-step reasoning with **safety guarantees** for write tools (calendar, enqueue, studio, research) without multi-tenant auth (deferred to Phase 16).

Phase 10.5 gave a **stable SSE bus** for streaming agent progress to the cockpit.

---

## Decision

### ReAct loop (C141)

```
while not finished and within budget:
  1. LLM predict (text + optional tool call)
  2. If tool call → execute via ToolExecutorPort
  3. Append observation to context
  4. Emit agent.step SSE event (C147)
```

Terminal states: `completed`, `budget_exhausted`, `killed`, `awaiting_confirm`.

### Budgets + kill-switch (C142)

| Budget | Default (mock CI) | Configurable |
|--------|-------------------|--------------|
| Max iterations | 8 | env / run config |
| Wall-clock | 30s | env / run config |
| Token budget | provider-reported | soft limit |

Kill-switch: caller or cockpit can abort in-flight run; emits terminal step.

### Capability model (C146) — not auth

| Tier | Examples | Gate |
|------|----------|------|
| **read** | cockpit slices, report, worker-health | auto-execute |
| **write-low** | update_studio_draft | auto with audit |
| **write-high** | enqueue_job, create_calendar_event, create_research_topic | **confirmRequired** (C155) |

Confirmation is **conversational** in the agent transcript — user says "yes" / "go ahead"; no modal UI in Phase 11.

### Audit (C148, C156)

Every tool invocation produces `JarvisAuditEntry` (C151):

- `runId`, `stepIndex`, `toolName`, `argsHash`, `riskTier`, `resultSummary`, `ts`, `simulated`

P11-A: in-memory audit buffer in core tests.  
P11-C: persist to `jarvis_audit_log` (C152).

### Voice integration (C157)

| Path | Behavior |
|------|----------|
| **Fast ack** | Unchanged — immediate "thinking" voice state |
| **Slow path** | `handle-turn.ts` starts agent run; streams `agent.step` to cockpit bus |
| **Confirm** | Agent pauses in `awaiting_confirm`; next user utterance resumes |

---

## Consequences

- Write tools without confirm are **eval hard-fail** (C160)
- Budget exhaustion must not leave partial writes un-audited
- P11-C council review **MANDATORY** for `handle-turn.ts` changes

---

## Alternatives rejected

| Option | Why rejected |
|--------|--------------|
| Unlimited loop until LLM stops | Runaway cost; CI flake |
| UI confirm modal | Out of scope; breaks voice-first flow |
| Auth tokens per tool | Phase 16; capability tiers sufficient for single-operator |
