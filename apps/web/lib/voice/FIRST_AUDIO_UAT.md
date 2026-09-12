# CLOUD-A4 — First-audio / mic latency UAT (laptop)

Cascaded path: **LLM tokens → sentence buffer → per-sentence TTS → play chunks**.

**Target:** first audible result chunk **&lt; 1.2s** after the live turn starts speaking (constant `FIRST_AUDIO_TARGET_MS = 1200` in `@zeref/jarvis-kernel`).

Cloud / CI **must not** claim this number was measured. Measure on the laptop with a real mic.

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

CI uses the same three mock flags and keeps the **sync-mock** 200 JSON path (`handleVoiceTurn` → `mode: "sync-mock"`).

## Live cascade (laptop keys, optional)

1. In `apps/web/.env.local`: set `OPENROUTER_API_KEY`, comment out `ZEREF_LLM_MOCK=1`. Keep Whisper sidecar **or** `ZEREF_WHISPER_MOCK=1`. TTS: `ZEREF_TTS_MOCK=1` or ElevenLabs/OpenAI keys (never commit them).
2. Restart `npm run dev -w @zeref/web`.
3. Open `/cockpit`, hold **PTT**, say a two-sentence prompt (no tool), release.
4. Stopwatch / HUD: time from PTT release (or `voice.state=thinking`) to **first result audio**.
5. Record the ms value in Planner notes. Pass if **&lt; 1200ms** on a warm run.

## Barge-in

While Jarvis is speaking, press PTT again. Playback must stop immediately and the in-flight agent run must abort (`killSignal` → `agent.step` type `killed`). Whisper sidecar path stays in `whisper-client.ts` — do not replace it with OpenAI Realtime.
