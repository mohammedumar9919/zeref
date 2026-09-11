# CLOUD-P62 — Phase 6.2 Visual Tier 3

**Queue ID:** CLOUD-P62  
**Contract:** [../../governance/phase-6.2-contract.md](../../governance/phase-6.2-contract.md) (C99–C110)  
**Remote:** Yes — UI only  
**Flash ROI:** Highest

## Goal

Workspace deep routes (hide grid), unified header, hero globe ≥58vh, voice pulse + JARVIS sync rings (CSS/wrapper — no WebGL rewrite).

## Allowed paths

- `apps/web/components/hud/**`
- `apps/web/components/shell/TopNav.tsx`
- `apps/web/components/cockpit/CockpitShell.tsx`, `CockpitGrid.tsx`
- `apps/web/components/globe/GlobeHero.tsx` (wrapper/CSS only)
- `apps/web/app/cockpit/**/page.tsx` (layout classNames only)
- `apps/web/app/globals.css`, `apps/web/tailwind.config.ts`
- `scripts/verify-phase-6.2.mjs` (create if missing)
- `apps/web/e2e/cockpit-workspace-6.2.spec.ts`
- `docs/governance/verify.md` (document gate)
- `package.json` / `.github/workflows/ci.yml` only if adding verify:phase-6.2

## Forbidden

- `apps/web/lib/**`, `apps/web/app/api/**`
- `packages/**`, `apps/worker/**`
- Changing point-cloud / Three.js mesh internals
- Purple gradients / green CTA (keep cyan/void DESIGN_SYSTEM)

## Acceptance

- [ ] `/cockpit/studio|calendar|reports|research` hide four-panel grid
- [ ] Single top bar (TopNav + HudHeader merged visually)
- [ ] Globe hero ≥58vh on `/cockpit`
- [ ] Pulse rings respect `prefers-reduced-motion`
- [ ] Playwright testids for workspace mode
- [ ] PR + AGENT_LOG; laptop takes Luke screenshot for Planner sign-off

## Prompt (paste into Grok Bot)

```
Read docs/cloud/README.md, QUEUE.md, phases/P62-visual-tier3.md, docs/CURRENT_STATE.md.
Implement CLOUD-P62 only. Branch cloud/p62-workspace-hud. Open PR using HANDOFF template.
Append AGENT_LOG. Stop when PR is ready — do not start A2.
```
