# ADR-019: Telemetry SSE stub (Phase 5.1)

**Status:** **DRAFT** (requires Planner approval)  
**Date:** 2026-05-30  
**Owner:** BFF/Events  
**Related:** [Phase 5.1 contract](../phase-5.1-contract.md) (Q2, C39) · [ADR-016](./ADR-016-bff-cockpit-slices.md) · [GAP_BACKLOG ZR-026](../../GAP_BACKLOG.md)

---

## Context

Luke HUD reference shows a **live telemetry band**. Phase 5.1 needs visible telemetry without fake scrolling logs ([failures-checklist.md](../../failures-checklist.md)). Real pipeline events require worker → SSE (ZR-026, Phase 6).

---

## Decision

1. Add **`GET /api/v1/events/stream`** — `text/event-stream` Route Handler in `apps/web`.
2. **Stub events only** in Phase 5.1:
   - `event: heartbeat` every 15s
   - `event: telemetry` with JSON `{ simulated: true, message, ts }`
3. UI **must** render a visible **`SIMULATED`** badge on the telemetry strip when `simulated === true`.
4. Optional contract: **`TelemetryEventSchema`** in `@zeref/contracts` (Zod).
5. **No** worker emission to this stream in 5.1.

---

## Consequences

- BFF/Events agent owns route + schema; UI agent owns strip component.
- Phase 6 replaces stub with real pg-boss / worker event bridge.

---

## Verification

- Route returns 200 with `text/event-stream` in dev.
- `verify:phase-5.1` may curl or integration-test first event line (QA).
