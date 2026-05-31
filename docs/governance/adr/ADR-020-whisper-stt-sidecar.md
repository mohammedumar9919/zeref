# ADR-020: Whisper STT sidecar (Phase 6)

**Status:** **DRAFT** (requires Planner approval with [phase-6-contract.md](../phase-6-contract.md))  
**Date:** 2026-05-30  
**Owner:** Whisper agent  
**Related:** Q1 · C51 · [GAP ZR-020](../../GAP_BACKLOG.md)

---

## Context

Phase 6 adds push-to-talk. Browser captures audio; transcription must not run in the Next.js bundle. Legacy hybrid voice used local STT; Zeref standardizes on **faster-whisper** in a Python sidecar ([STACK.md](../../../.planning/codebase/STACK.md)).

---

## Decision

1. New app: **`apps/whisper`** — Python 3.11+, `faster-whisper` (CPU default; CUDA optional).
2. HTTP API (FastAPI or Flask — agent picks; document in README):
   - **`GET /health`** → `{ ok: true, model: string }`
   - **`POST /v1/transcribe`** — `multipart/form-data` field `audio` (webm/wav); returns `{ text: string, language?: string, durationMs?: number }`
3. Default bind: **`127.0.0.1:8765`** — not exposed publicly; BFF proxies only.
4. Env: `WHISPER_MODEL=base` (dev), `WHISPER_DEVICE=cpu`, `WHISPER_PORT=8765`.
5. **CI / verify:** `ZEREF_WHISPER_MOCK=1` — BFF returns fixture transcript without sidecar running.

---

## Consequences

- Whisper agent owns `apps/whisper/**` only.
- BFF agent owns proxy + mock switch.
- No whisper imports in `apps/web` client components.

---

## Verification

- Sidecar health 200 when running locally.
- `verify:phase-6` passes with `ZEREF_WHISPER_MOCK=1` (no Python in CI required for green gate).
