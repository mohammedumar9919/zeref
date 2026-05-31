# ADR-024: Live SSE voice events (Phase 6)

**Status:** **DRAFT** (requires Planner approval)  
**Date:** 2026-05-30  
**Owner:** BFF/Voice agent  
**Related:** Q5 · C58 · C60 · [ADR-019](./ADR-019-telemetry-sse-stub.md) · [GAP ZR-026](../../GAP_BACKLOG.md)

---

## Context

Phase 5.1 added **`GET /api/v1/events/stream`** with **`simulated: true`** telemetry (ADR-019). Phase 6 replaces theater with honest live events when voice/pipeline activity occurs.

---

## Decision

1. **Extend** existing SSE route — do not add a second stream URL.
2. New event types:

| Event | Payload (Zod) | When |
|-------|---------------|------|
| `voice.state` | `{ state, ts, simulated?: boolean }` | PTT down/up, TTS start/end |
| `voice.transcript` | `{ role: 'user' \| 'ack' \| 'assistant', text, ts }` | After STT / kernel phases |
| `pipeline` | `{ stage, message, ts, simulated: false }` | Optional BFF-emitted status |

3. **`TelemetryEventSchema`** retained — stub heartbeat may remain until worker bridge; when any live voice event fires, UI **removes SIMULATED badge** on telemetry strip if `simulated !== true` on last event (or dedicated `streamMode: live` in first live event).
4. Worker → SSE bridge **optional** in 6; BFF may emit voice events from `/voice/turn` handler.
5. Contracts: **`VoiceEventSchema`**, **`VoiceTranscriptEventSchema`** in `@zeref/contracts` phase6.

---

## Consequences

- BFF agent extends `apps/web/app/api/v1/events/stream/route.ts` + `packages/contracts`.
- UI `TelemetryStrip` + new transcript panel consume events.
- Phase 7 worker bridge fills `pipeline` events without URL change.

---

## Verification

- Mock turn emits ≥1 `voice.state` on stream (integration test or curl -N sample).
- No fake scrolling logs — each line maps to a schema-valid event.
