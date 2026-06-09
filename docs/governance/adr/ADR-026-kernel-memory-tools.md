# ADR-026: Kernel memory tools + server-only write path (Phase 7)

**Status:** **APPROVED** (Planner 2026-05-31)  
**Date:** 2026-05-31  
**Owner:** Kernel agent  
**Related:** Q2 · C65 · Amendment C · [GAP ZR-030](../../GAP_BACKLOG.md)

---

## Context

Phase 6 `processTurn` returns ack before slow path ([ADR-021](./ADR-021-jarvis-kernel-two-phase-speak.md)). Memory I/O must not regress ack latency.

---

## Decision

1. **New tools** in `packages/jarvis-kernel`:
   - `memory_search` — ranked results with temporal scoring + contradiction filter
   - `memory_save` — episodic save from turn summary (auto-tier classifier in `@zeref/zeref-memory`)

2. **Routing:** Keyword selection in `selectToolsForTranscript` (Amendment C) — e.g. remember/recall/last week → memory tools.

3. **Slow path only:** `memory_save` / `memory_search` run inside `runSlowPath` after ack; never await before `ack` return.

4. **Write path:** Server-only — kernel and worker hooks. Optional BFF `GET /api/v1/memory/search` read-only for Settings.

5. **Mock:** When `ZEREF_MEMORY_MOCK=1`, tools use fixture adapter (no network/DB).

---

## Consequences

- Kernel depends on `@zeref/zeref-memory` (workspace package).
- BFF emits `memory.*` SSE after kernel tool completion (ADR-027).

---

## Verification

- Unit test: ack returns before `memory_search` completes.
- `npm test -w @zeref/jarvis-kernel` with `ZEREF_MEMORY_MOCK=1`.
