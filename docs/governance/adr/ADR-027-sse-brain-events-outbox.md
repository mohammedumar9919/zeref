# ADR-027: SSE brain events + worker outbox (Phase 7)

**Status:** **APPROVED** (Planner 2026-05-31)  
**Date:** 2026-05-31  
**Owner:** BFF + Worker agents  
**Related:** Q3 · Q5 · C66–C69 · Amendment A/B · [GAP ZR-026](../../GAP_BACKLOG.md), [GAP ZR-031](../../GAP_BACKLOG.md)

---

## Context

Phase 6 extended SSE for voice ([ADR-024](./ADR-024-live-sse-voice-events.md)) using in-process `VoiceEventBus`. Phase 7 adds memory events and completes worker→SSE (ZR-026). `scripts/worker.mjs` is a **separate process** — in-memory bus cannot bridge worker completions.

---

## Decision

### Amendment A — Unified cockpit event bus

1. Generalize `getVoiceEventBus` → **`getCockpitEventBus`** (or re-export alias) — single fan-out for `voice.*`, `memory.*`, `pipeline`.
2. `GET /api/v1/events/stream` subscribes once; no parallel global buses.

### Memory SSE event types (C66)

| Event | Payload highlights |
|-------|-------------------|
| `memory.saved` | `{ entryId, tier, ts, turnId?, simulated? }` |
| `memory.search` | `{ query, resultCount, ts, turnId?, simulated? }` |
| `memory.contradiction` | `{ entryId, supersededId, ts, simulated? }` |
| `memory.entity_changed` | `{ entityId, type, ts, simulated? }` |

Contracts in `@zeref/contracts` phase7.

### Amendment B — Worker outbox (Q5 / C68)

1. Table **`cockpit_sse_outbox`**: `{ id, event_type, payload_json, created_at, delivered_at? }`.
2. Worker `INSERT` on pg-boss job completion (`collect`, `normalize`, `embed`, `analyze`, `report`).
3. BFF SSE route: `LISTEN cockpit_events` (or poll ≤500 ms) per open connection; emit `pipeline` with **`simulated: false`**.
4. **CI / worker absent:** BFF may synthesize events with **`simulated: true`** — never fake-live.

### Globe brain states (C67)

- Attribute **`data-globe-brain-state`** on `globe-island` (orthogonal to `data-globe-voice-state`).
- Values: `idle` \| `memory_saved` \| `searching` \| `contradiction` \| `entity_changed`.
- UI maps jarvis-orb reactions (shader-safe; ADR-015/023).

### Performance (C69)

- Hot path: BFF emit → client attribute update.
- **Dev target:** <100 ms on mock bus.
- **CI tolerance:** ≤150 ms in Playwright/integration test.

---

## Consequences

- BFF owns bus generalization + outbox drain.
- Worker owns outbox INSERT on job complete.
- UI owns `data-globe-brain-state` wiring (P7-D).

---

## Verification

- Integration: mock `memory.saved` → SSE frame → Playwright attribute.
- Worker test: job complete → outbox row → BFF drain → `pipeline` event `simulated: false` (dev stack with worker daemon).
