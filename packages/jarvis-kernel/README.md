# @zeref/jarvis-kernel

Server-side Jarvis voice orchestration for Phase 6 (ADR-021, ADR-022).

## API

- `processTurn(input, deps?)` — returns `{ ack, complete }` where **ack is immediate** and `complete` resolves after read-only tools + LLM.
- `processTurnSync(input, deps?)` — CI mock path; awaits both phases.
- `synthesizeSpeech` via `defaultTtsAdapter(text, opts?)` — ElevenLabs primary, OpenAI fallback, mock fixture when flagged.
- Read-only tools: `get_cockpit_summary`, `get_latest_report_headline`, `get_pipeline_status`.

## Environment variables

| Variable | Purpose |
|----------|---------|
| `ZEREF_TTS_MOCK=1` | Use `fixtures/phase-6/tts-mock.wav` (CI) |
| `ZEREF_LLM_MOCK=1` | Deterministic LLM text without OpenRouter |
| `ZEREF_WORKER_AVAILABLE=1` | `get_pipeline_status` returns live idle status |
| `ELEVENLABS_API_KEY` | Primary TTS (server-only) |
| `ELEVENLABS_VOICE_ID` | British Jarvis voice preset |
| `OPENAI_API_KEY` | TTS fallback when ElevenLabs fails |
| `OPENROUTER_API_KEY` | Live LLM path |
| `OPENROUTER_MODEL` | Optional model override (default `openai/gpt-4o-mini`) |

Never expose keys via `NEXT_PUBLIC_*`.
