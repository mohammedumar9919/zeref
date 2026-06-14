# ADR-037: SSE and outbox consolidation (Phase 10.5)

**Status:** **APPROVED** (Lead 2026-06-14)  
**Date:** 2026-06-14  
**Owner:** P10.5-A + P10.5-B  
**Related:** [phase-10.5-contract.md](../phase-10.5-contract.md) C125–C130 · [ADR-027](./ADR-027-sse-brain-events-outbox.md) · [ADR-036](./ADR-036-live-ops-pipeline-truth.md) C117/C124

---

## Context

Phase 10 made pipeline SSE honest via outbox drain and `isOutboxDrainAllowed()`. Remaining instability:

1. **Client:** Each cockpit page wrapped its own `VoiceHudShell`; `TelemetryStrip` opened a **second** `EventSource` → reconnect storms and lost voice state on panel nav (master plan §2.1 #3/#4).
2. **Server:** Each SSE connection ran its own `setInterval` outbox poll → N× DB load and duplicate emissions (§2.1 #5).

Phase 11 JARVIS requires a **stable, single** event bus per cockpit session.

---

## Decision

### Client (P10.5-A)

| Before | After |
|--------|-------|
| Per-page `VoiceHudShell` + provider | **One** `VoiceProvider` + `VoiceHudShell` in `cockpit/layout.tsx` |
| TelemetryStrip owns EventSource | TelemetryStrip **subscribes** to shared stream from `VoiceProvider` |
| Error → implicit reconnect loop | **Close** on error; no reconnect storm |

### Server (P10.5-B)

| Before | After |
|--------|-------|
| `setInterval` per SSE `GET` | **One** process-level outbox poller (module singleton) |
| Each stream drains independently | Poller emits to in-process bus; **`events/stream`** forwards to subscribers |
| C117 gate on connect | **`isOutboxDrainAllowed()`** still gates poller start |

### Invariants (carry-forward)

- C124: no sync DB on HTTP handler request path for drain
- C117: worker absent → simulated pipeline only
- C128: one browser EventSource per cockpit tab

---

## Consequences

- P10.5-A owns layout + client components only
- P10.5-B owns poller module + stream route + must not touch cockpit pages
- New e2e (P10.5-D optional): assert single EventSource across nav

---

## Alternatives rejected

| Option | Why rejected |
|--------|--------------|
| Keep dual EventSource with dedupe | Still doubles connections; race on reconnect |
| Poll outbox only on client timer | Violates server truth; duplicates Phase 10 drain |
| WebSocket migration | Out of scope; SSE contract locked through Phase 10 |
