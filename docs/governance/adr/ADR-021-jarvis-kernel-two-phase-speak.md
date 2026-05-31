# ADR-021: jarvis-kernel + two-phase speak (Phase 6)

**Status:** **DRAFT** (requires Planner approval)  
**Date:** 2026-05-30  
**Owner:** Kernel agent  
**Related:** Q3–Q4 · C52 · C56 · [GAP ZR-021, ZR-023](../../GAP_BACKLOG.md)

---

## Context

Jarvis voice needs server-side orchestration: STT transcript → intent/tools → spoken response. Legacy used **ack then result** to reduce perceived latency. Phase 5 forbade voice (C30); Phase 6 lifts that with bounded scope.

---

## Decision

1. New package: **`packages/jarvis-kernel`** (`@zeref/jarvis-kernel`).
2. Core API:

```ts
processTurn(input: JarvisTurnInput): Promise<JarvisTurnOutput>
```

| Field (output) | Purpose |
|----------------|---------|
| `ackText` | Short spoken first phase (~≤12 words) |
| `resultText` | Full answer second phase |
| `toolCalls` | Audit log of read-only tools invoked |
| `events` | SSE payloads for BFF to emit |
| `globeState` | Suggested `thinking` → `speaking` transitions |

3. **Two-phase speak (binding UX):**
   - **Phase A (ack):** emit `ackText` immediately after transcript validated (template or fast intent classify).
   - **Phase B (result):** run tools + optional OpenRouter (server-side, `ZEREF_LLM_MOCK` in CI); emit `resultText`.

4. **Tools v1 (read-only):** `get_cockpit_summary`, `get_latest_report_headline`, `get_pipeline_status` — no enqueue/scrape.

5. Schemas in **`@zeref/contracts`** (`phase6/`): `JarvisTurnInputSchema`, `JarvisTurnOutputSchema`, `PHASE6_CONTRACT_VERSION`.

---

## Consequences

- Kernel agent owns `packages/jarvis-kernel/**` + contract schemas.
- BFF orchestrates STT → kernel → TTS; UI never calls kernel directly.
- OpenRouter only inside kernel; mocked in CI.

---

## Verification

- Unit tests: ack always non-empty; result follows tool mock path.
- No worker job types added without contract amendment.
