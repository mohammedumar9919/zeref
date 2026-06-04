# ADR-033: Luke Tier-2 visual acceptance (Phase 6.1)

**Status:** **APPROVED** (Planner 2026-06-03)  
**Date:** 2026-06-03  
**Owner:** UI agent  
**Related:** Q1–Q5 · C91–C98 · Amendment N · [phase-6.1-contract.md](../phase-6.1-contract.md) · [phase-5.1-contract.md](../phase-5.1-contract.md)

---

## Context

Phases 5.1–8 shipped functional Luke HUD fusion (point-cloud globe, HUD shell, glass columns, voice/brain states). Planner deferred **Tier-2 pixel parity** vs [lukebuildsai-jarvis-hud.jpeg](../../design/reference/lukebuildsai-jarvis-hud.jpeg) to optional Phase 6.1. Phase 9 runs in parallel — 6.1 must remain **UI-only** with no API/contract/worker edits.

---

## Decision

### Acceptance model (Q1)

Visual sign-off uses a **checklist + reference screenshot**, not automated pixel diff:

| Pillar | Check |
|--------|-------|
| Header | Status chips align with reference density; mono uppercase labels |
| Footer | Objective line + telemetry row spacing |
| Glass columns | Consistent frost, border, padding on all four panels |
| Telemetry / AUDIO | Strip typography; SIMULATED/live badges unchanged in meaning |
| Globe hero | ≥45vh; no mesh or state-machine edits |

Deliverable screenshot: `docs/design/reference/screenshots/zeref-cockpit-6.1-hud.png`

### Scope firewall (Amendment N)

- **Allowed:** HUD components, panel chrome classNames, global CSS tokens, globe **wrapper** only.
- **Forbidden:** BFF, worker, contracts, voice/memory/studio/calendar/research behavior, WebGL internals.

### Verify (Q4)

`scripts/verify-phase-6.1.mjs`:

1. Chain `verify:phase-5.1` (phases 0–5.1).
2. Playwright with `ZEREF_PHASE61_UI=1` — C48 regression + C91–C94 testids.
3. Does **not** chain Phase 7–9 flags.

---

## Consequences

- P6.1-A UI agent owns visual diff only.
- P6.1-E owns verify script + e2e + CI step.
- Phase 9 workers must not touch 6.1 allowed paths.

---

## Verification

- All C48 Playwright assertions still pass.
- New C91–C94 testids present in DOM.
- Planner visual sign-off on screenshot.
