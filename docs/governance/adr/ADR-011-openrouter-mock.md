# ADR-011: OpenRouter model and CI mock

**Status:** Accepted (Phase 4)

## Context

Report narrative uses OpenRouter. CI must not call live LLM APIs.

## Decision

- Default model: **`openai/gpt-4o-mini`** (`OPENROUTER_MODEL` override).
- CI and verify: **`ZEREF_LLM_MOCK=1`**; strip `OPENROUTER_API_KEY` in verify children.
- Mock returns deterministic markdown with `[mf:uuid]` citation markers.

## Consequences

- `@zeref/reports` `generateNarrative()` never requires network in CI.
- Live OpenRouter reserved for local dev with API key set.
