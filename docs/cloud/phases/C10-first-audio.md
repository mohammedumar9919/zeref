# C10 — First-audio metric + pipelined sentence TTS

**Goal:** Jarvis starts speaking sooner, and we measure it honestly: time from push-to-talk release to the first reply audio actually playing.

Today each sentence is synthesised serially and sent whole as base64 in a `voice.audio` SSE event; nothing measures first audio at runtime (only the manual stopwatch in `apps/web/lib/voice/FIRST_AUDIO_UAT.md`). Provider byte-streaming (ElevenLabs `/stream`) is **out of scope** (C10b).

## Deliverables

1. **Contracts** (`packages/contracts/src/phase6/voice-events.ts`): optional `seq` (int ≥ 0) and `serverFirstAudioMs` (number ≥ 0) on `VoiceAudioEventSchema` (schema is `.strict()` — add the fields there; old fixtures stay valid). New `VoiceLatencySampleSchema {turnId, firstAudioMs, source: "client"}` and `FIRST_AUDIO_TARGET_MS = 1200` exported from contracts.
2. **Server** (`apps/web/lib/voice/handle-turn.ts`, `apps/web/lib/jarvis/agent-runtime.ts` speakable chain only): start each sentence's TTS as soon as the sentence is ready (do not wait for the previous one) but **emit `voice.audio` strictly in sentence order** by `seq`. Barge-in / abort must cancel pending sentences (nothing emitted after abort). Record turn-end time after transcription; first emitted audio carries `serverFirstAudioMs`. The sync-mock CI path stays whole-buffer.
3. **Client** (`apps/web/components/voice/VoiceProvider.tsx`, `apps/web/lib/voice/audio-playback.ts`): mark `performance.now()` on PTT release; when the first reply audio fires `playing`, compute `firstAudioMs` and POST a sample. C30: import only from `@zeref/contracts`, never the kernel.
4. **Ops route** `apps/web/app/api/v1/ops/voice-latency/route.ts`: POST validates a sample into an in-memory ring buffer (last 100); GET returns `{count, p50Ms, p95Ms, targetMs, lastSampleAt}` and `count: 0` with null percentiles when empty. Never invent a number.
5. Update `FIRST_AUDIO_UAT.md` to read the GET route instead of a stopwatch; document the route in `docs/api-contracts.md`.

## Rules

- No latency number in UI/docs/README until a real laptop sample exists (P15).
- Sentence order is test-enforced (a slow first sentence must still play first).
- No change to TTS provider logic (`synthesize-speech.ts`), whisper client, kernel react loop, or CI workflow.

## Council

Contract change (`voice-events.ts`) + new API route → **council review required**.
