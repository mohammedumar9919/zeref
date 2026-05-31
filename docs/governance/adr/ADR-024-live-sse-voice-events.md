# ADR-024: Live SSE voice events (Phase 6)

**Status:** **APPROVED** (Planner 2026-05-30; [phase-6-contract.md](../phase-6-contract.md) Amendment A)  
**Date:** 2026-05-30  
**Owner:** BFF/Voice agent  
**Related:** Q5 · C56 · C60 · [ADR-019](./ADR-019-telemetry-sse-stub.md) · [GAP ZR-026](../../GAP_BACKLOG.md)

---

## Context

Phase 5.1 added **`GET /api/v1/events/stream`** with **`simulated: true`** telemetry (ADR-019). Phase 6 adds live voice events. **Amendment A:** two-phase audio delivery uses SSE — not a blocking POST body in live/dev.

---

## Decision

1. **Extend** existing SSE route — do not add a second stream URL.
2. New event types (all include **`turnId`** when part of a voice turn):

| Event | Payload (Zod) | When |
|-------|---------------|------|
| `voice.state` | `{ turnId?, state, ts, simulated?: boolean }` | PTT down/up, thinking, speaking |
| `voice.transcript` | `{ turnId, role: 'user' \| 'ack' \| 'assistant', text, ts }` | After STT / kernel phases |
| `voice.audio` | `{ turnId, phase: 'ack' \| 'result', audioBase64, mimeType, ts }` | After TTS for each phase |
| `pipeline` | `{ stage, message, ts, simulated: boolean }` | Optional BFF status |

3. Contracts in **`@zeref/contracts` phase6:**
   - `VoiceStateEventSchema`
   - `VoiceTranscriptEventSchema`
   - **`VoiceAudioEventSchema`** (Amendment A)
   - `PipelineEventSchema` (optional)

4. **`TelemetryEventSchema`** retained — remove UI SIMULATED badge when live voice/pipeline events arrive with `simulated !== true`.

5. Worker → SSE bridge **optional** in 6; BFF emits from `/voice/turn` async handler.

6. **CI mock path:** BFF may skip SSE audio events when returning synchronous 200 mock JSON from `/voice/turn`.

---

## Consequences

- BFF extends `apps/web/app/api/v1/events/stream/route.ts` + shared event bus for in-process emit.
- UI `VoiceController` plays `voice.audio` in order (ack before result).
- `turnId` correlation prevents SSE/turn race.

---

## Verification

- curl -N shows `voice.transcript` + `voice.audio` after mock/live turn.
- Integration test with `ZEREF_WHISPER_MOCK=1`.
