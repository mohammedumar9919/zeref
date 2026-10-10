# CLOUD-C10 — First-audio metric + pipelined sentence TTS

- Contracts: optional `seq` / `serverFirstAudioMs` on strict `VoiceAudioEventSchema` (old fixture still valid); new `VoiceLatencySampleSchema` and `FIRST_AUDIO_TARGET_MS` exported from `@zeref/contracts`.
- Server: `createSentenceAudioPipeline` in `handle-turn.ts` starts each sentence's TTS immediately (max 3 in flight) and emits `voice.audio` strictly by `seq`; abort drops everything not yet emitted. Clock starts after transcription; first audio of a live turn carries `serverFirstAudioMs`. Sync-mock CI path unchanged (whole buffer, no `seq`). `agent-runtime.ts` unchanged — the speakable callback now only enqueues, so the existing chain no longer serializes TTS.
- Client: `VoiceProvider` marks PTT release, POSTs one `{turnId, firstAudioMs, source:"client"}` sample when the first reply `<audio>` fires `playing` (`playAudioBlob` `onPlaying`). Imports `@zeref/contracts` only (C30). `activeTurnRef` is cleared on submit so the live ack (emitted before the 202) is no longer dropped.
- Ops route `GET/POST /api/v1/ops/voice-latency`: in-memory ring (100), nearest-rank p50/p95, `count: 0` + nulls when empty.
- No latency number recorded anywhere — awaiting a real laptop sample (P15).
- Local results: contracts 126/126; web suite 206 pass / 0 fail / 3 skipped (Postgres-gated); C10 tests 12/12; Jarvis eval 10/10, 0 unsafe; `tsc -b tsconfig.build.json` clean; web `tsc --noEmit` errors only in pre-existing drizzle files.
- Council review required (contract change + new API route).
