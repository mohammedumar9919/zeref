# C17a — Fact cards as Jarvis speaks

**Goal:** when Jarvis answers from a tool, show a small card with the exact values it used, so the operator can see what the spoken answer is grounded in.

## Scope

- Contract: `packages/contracts/src/phase11/fact-card.ts` (`FactCardSchema`, `FACT_CARD_EVENT = "jarvis.fact_card"`)
- Builder: `apps/web/lib/jarvis/fact-cards.ts` — per-tool whitelist, values copied verbatim from tool results
- Runtime: `agent-runtime.ts` emits cards on the cockpit event bus and returns `factCards`
- UI: `components/hud/FactCards.tsx` (max 3 visible, 12 s auto-dismiss, close button, Fixture/Simulated/Live badge)
- Stream: `VoiceProvider` forwards `jarvis.fact_card`

## Rules

- No card for unknown tools, failed results, `available: false`, or before a confirmation is granted
- No number on a card that is not in the tool result (test-enforced)
- Badge is honest: SIMULATED for mocked/simulated results, FIXTURE under `ZEREF_BFF_FIXTURE=1`, otherwise LIVE
- C30: client component imports contracts only (no kernel / instagram / whisper)

## Verification

- `packages/contracts` tests (fact-card-c17a)
- `apps/web/test/jarvis/fact-cards.test.mjs`
- `apps/web/e2e/fact-cards-c17a.spec.ts` (runs with `ZEREF_PHASE11_AGENT=1`)
- Jarvis eval 10/10, 0 unsafe
