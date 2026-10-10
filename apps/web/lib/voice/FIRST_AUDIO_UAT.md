# CLOUD-A4 / C10 — First-audio / mic latency UAT (laptop)

Cascaded path: **LLM tokens → sentence buffer → per-sentence TTS (concurrent, emitted in order) → play chunks**.

**Target:** first reply audio playing **&lt; 1.2s** after PTT release (constant `FIRST_AUDIO_TARGET_MS = 1200` in `@zeref/contracts`).

Cloud / CI **must not** claim this number was measured. Measure on the laptop with a real mic, and do not copy a number into docs/README/UI until a real laptop sample exists.

## How it is measured (C10)

- **Client:** the cockpit marks `performance.now()` on PTT release; when the first reply `<audio>` of that turn fires `playing`, it POSTs `{ turnId, firstAudioMs, source: "client" }` to `/api/v1/ops/voice-latency`.
- **Server:** the first `voice.audio` SSE event of a live turn carries `serverFirstAudioMs` (transcription finished → audio emitted). Visible in DevTools → Network → `events/stream`.
- Samples live in memory (last 100) and reset when the dev server restarts. Mock TTS beeps are still timed — restart before a real run so mock samples don't mix in.

## Fixture / mock (no live keys)

```powershell
cd c:\Projects\zeref
$env:ZEREF_WHISPER_MOCK='1'
$env:ZEREF_TTS_MOCK='1'
$env:ZEREF_LLM_MOCK='1'
$env:ZEREF_BFF_FIXTURE='1'
$env:ZEREF_PHASE11_AGENT='1'
npm run dev -w @zeref/web
```

CI uses the same three mock flags and keeps the **sync-mock** 200 JSON path (`handleVoiceTurn` → `mode: "sync-mock"`, whole-buffer audio, no `seq`).

## Live cascade (laptop keys, optional)

1. In `apps/web/.env.local`: set `OPENROUTER_API_KEY`, comment out `ZEREF_LLM_MOCK=1`. Keep Whisper sidecar **or** `ZEREF_WHISPER_MOCK=1`. TTS: ElevenLabs/OpenAI keys for a real number (never commit them).
2. Restart `npm run dev -w @zeref/web` (clears old samples).
3. Open `/cockpit`, hold **PTT**, say a two-sentence prompt (no tool), release. Repeat 5+ times (first run is cold).
4. Read the result:

   ```powershell
   Invoke-RestMethod http://localhost:3000/api/v1/ops/voice-latency
   ```

   `count` = samples received; `p50Ms` / `p95Ms` are `null` until at least one sample exists.
5. Record `count`, `p50Ms`, `p95Ms` in Planner notes. Pass if **p50Ms &lt; targetMs** on warm runs.

## Barge-in

While Jarvis is speaking, press PTT again. Playback must stop immediately and the in-flight agent run must abort (`killSignal` → `agent.step` type `killed`); no further `voice.audio` for that turn arrives, even for sentences whose TTS already finished. Whisper sidecar path stays in `whisper-client.ts` — do not replace it with OpenAI Realtime.
