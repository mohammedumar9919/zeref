---
name: council-merge-slice
description: Stage 3 — Lead chairman synthesis, verify gate run, CURRENT_STATE update after council review.
---

# Council Stage 3 — Synthesize

## Steps

1. Pick winning proposal from Stage 2 (or combine if non-overlapping).
2. User runs acceptance in **their terminal**:
   - `npm run build` / `npm run lint`
   - `.\scripts\phase_gate.ps1 -Phase <n>` for the phase touched
   - Playwright only via verify script (not ad-hoc long runs in agent shell)
3. Update `docs/CURRENT_STATE.md` and `.planning/STATE.md` with status and next task.
4. Human Gate 2 — user approves merge / Planner sign-off.

## Do not merge if

- Stage 2 Block unresolved
- Any `verify:phase-N` fails for N ≤ current shipped phase
- Worker slice merged without separate agent chat (Phase 4 regression)
