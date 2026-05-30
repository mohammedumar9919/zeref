# Worker task cards queue — Zeref

Lead copies cards into **new** worker chats. Update status here after each slice.

---

## READY — Phase 5.1 Luke HUD (Discuss + Contract next)

### Card: Agent UI — Jarvis HUD shell

```markdown
You are **Agent UI** for Zeref — **cockpit UI only**.

## Read first
1. docs/design/reference/lukebuildsai-jarvis-hud.jpeg
2. docs/design/DESIGN_SYSTEM.md
3. docs/governance/adr/ADR-015-globe-performance.md (needs amendment first)
4. Invoke ui-ux-pro-max skill — Jarvis HUD aesthetic

## You own ONLY
- `apps/web/components/**`
- `apps/web/app/cockpit/**`
- `apps/web/app/globals.css` (if needed)

## FORBIDDEN
- `apps/worker/**`
- BFF routes

## Deliverables
1. Fusion layout: Luke HUD chrome wraps Studio/Calendar/Reports/Research panels
2. Point-cloud globe + rings (per amended ADR-015)
3. Telemetry + AUDIO I/O placeholders (SIMULATED until SSE)
4. Playwright updates

## Acceptance
1. `npm run verify:phase-5` or verify:phase-5.1 when exists
2. Screenshot vs reference JPEG

## Return to lead
- Screenshot + perf notes + ADR compliance
```

---

## COMPLETED — Phase 5 (reference)

Multi-agent commits @ `568a5fc` — UI, BFF, Docs, QA agents. See `.planning/STATE.md`.

---

## Template (blank)

```markdown
You are **Agent <NAME>** for Zeref — **<SCOPE> only**.

## Read first
1. docs/CURRENT_STATE.md
2. docs/GAP_BACKLOG.md
3. docs/api-contracts.md
4. docs/AGENTS.md

## You own ONLY
- `path/**`

## FORBIDDEN
- `other/**`

## Deliverables
1. ...

## Acceptance
1. `.\scripts\phase_gate.ps1 -Phase <n>`

## Return to lead
- Files changed
- Risks for Stage 2

**Do NOT** edit `.cursor/plans/*.plan.md`
```
