# ADR-022: ElevenLabs TTS + CI mock (Phase 6)

**Status:** **APPROVED** (Planner 2026-05-30)  
**Date:** 2026-05-30  
**Owner:** Kernel agent  
**Related:** Q2 · C53 · [GAP ZR-022, ZR-025](../../GAP_BACKLOG.md)

---

## Context

Jarvis persona requires **British** TTS. ElevenLabs is primary per project stack; CI must not call paid APIs ([failures-checklist.md](../../failures-checklist.md)).

---

## Decision

1. **Primary:** ElevenLabs text-to-speech — voice ID from `ELEVENLABS_VOICE_ID` (British Jarvis preset documented in README, not committed).
2. **Fallback:** OpenAI TTS (`OPENAI_API_KEY`) only when ElevenLabs fails — log warning; same interface in kernel.
3. **`ZEREF_TTS_MOCK=1`:** synthesize returns **`fixtures/phase-6/tts-mock.wav`** (audible 440 Hz PCM tone for UAT; deterministic duration from text length).
4. API keys **server-only** — `apps/web` Route Handlers or kernel; never `NEXT_PUBLIC_*`.
5. Output format: **audio/mpeg** or **audio/wav** — BFF returns URL or base64 to client; document choice in kernel README.

---

## Consequences

- Kernel exports `synthesizeSpeech(text, opts)` with mock branch.
- Settings page may show TTS provider status (read-only) — optional UI stretch.

---

## Verification

- With `ZEREF_TTS_MOCK=1`, no network calls to ElevenLabs in tests.
- `verify:phase-6` sets mock flag in CI.
