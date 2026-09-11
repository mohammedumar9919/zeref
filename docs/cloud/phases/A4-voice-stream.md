# CLOUD-A4 — Streaming voice lite (code)

**Queue ID:** CLOUD-A4  
**Remote:** Code yes · **UAT laptop** (mic / latency)

## Goal

Cascaded streaming: LLM tokens → sentence buffer → streaming TTS; play chunks; barge-in aborts run (`killSignal`); HUD subscribes to existing `agent.step` events. **Do not** replace tool loop with OpenAI Realtime.

## Allowed paths

- `packages/jarvis-kernel/**` (streaming adapters / ports — keep portable core)
- `apps/web/lib/voice/**`, `apps/web/lib/jarvis/**`
- `apps/web/components/voice/**`, HUD listeners for `agent.step`
- TTS client modules
- Tests with mocks

## Forbidden

- Deleting Whisper sidecar path
- Making Realtime the default tool-calling brain
- Committing API keys

## Acceptance

- [ ] Mock path still works in CI
- [ ] First-audio streaming path implemented (document target &lt;1.2s; measure on laptop)
- [ ] Barge-in stops playback + aborts agent
- [ ] PR + AGENT_LOG; laptop measures latency
