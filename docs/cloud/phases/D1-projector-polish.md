# CLOUD-D1 — Projector polish (audience-facing UI)

**Queue ID:** CLOUD-D1  
**Status:** see [../QUEUE.md](../QUEUE.md)  
**Remote:** Yes (fixture)  
**Depends on:** CLOUD-C0 merged (C0 edits `cockpit-hud-6.1.spec.ts`); may run in parallel with C1 / C6 — no shared files  
**Branch prefix:** `cloud/d1-`  
**Skill:** `.cursor/skills/ui-ux-pro-max/SKILL.md`

## Goal

The 2026-09-28 user-perspective review (1920×1080 screenshots) found developer jargon and projector-hostile sizing on every screen. Make the cockpit readable and honest for an audience **without** changing data, contracts or behaviour.

## Findings to fix

| Screen | Problem | Fix |
|--------|---------|-----|
| Header | Chip `PHASE 10` (from `getActivePhaseLabel()` in `apps/web/lib/phase-marker.ts`) | Replace the visible chip with the data mode: `LIVE`, `FIXTURE` or `STALE` (reuse the data-age logic). Keep `getWebPhaseMarker()` as a hidden `data-phase` attribute for tests |
| Telemetry strip | `Pipeline idle — stub telemetry (Phase 5.1)` (`apps/web/lib/events/index.ts:8`) | `Pipeline idle` (keep the `SIMULATED` badge) |
| Studio hub | `(Phase 8)` in subtitle; one small card in an empty 1080p screen | Remove phase text; larger card, empty-state hint "Collect more posts to fill Studio" |
| Research hub | Shows `INSTAGRAM_ACCESS_TOKEN not configured` / `FACEBOOK_ACCESS_TOKEN … not configured` (server messages from `lib/jarvis/instagram-snapshot.ts`, `competitor-discovery.ts` passed through to the UI) | Map to UI copy at render time in `components/research/**`: `Competitor data: sample (connect Instagram for live)`. Do **not** change the server messages (ops/health + tests rely on them) |
| Report detail | `buildReportCharts` (`components/reports/report-view.ts` ≈ l.43–63) turns categorical `vsCohort` into fake bar values 75/50/25 → "VS INLINE 50"; "Cited facts" renders as "C1" | Categorical chip, no numeric bar: "Above your usual" / "In line with your usual" / "Below your usual" / "Not enough history". Count label "Facts cited: 1". If the report exposes baseline n, show "vs N posts" and append "— low confidence" when n < 5; otherwise omit |
| Studio hub (count) | One lone card | Show "N posts in sample data" (fixture) / "N posts" (live) above the list |
| All pages | Body / label text ≈ 10 px at 1080p | Raise the HUD type scale so the smallest visible label is ≥ 13 px and body ≥ 15 px at 1920×1080; panel titles ≥ 18 px |

## Allowed paths

- `apps/web/components/hud/HudHeader.tsx`, `HudFooter.tsx`, `TelemetryStrip.tsx`
- `apps/web/lib/phase-marker.ts`, `apps/web/lib/events/index.ts` (label string only)
- `apps/web/components/studio/StudioHub.tsx`, `apps/web/components/research/ResearchHub.tsx`, `apps/web/components/research/**` (copy only)
- `apps/web/app/globals.css`, `apps/web/tailwind.config.*` (type scale tokens only)
- `apps/web/components/reports/report-view.ts`, `apps/web/components/reports/ReportCharts.tsx` (honesty fix only — C6 owns the rest of `components/reports/**`), `apps/web/test/report-view.test.mjs` (create/extend)
- `apps/web/e2e/projector-d1.spec.ts` (create)
- Specs whose **exact text** assertions change because of the copy fixes (update to the new exact text; never delete or loosen): `apps/web/e2e/cockpit-hud-6.1.spec.ts`, `cockpit-hud-5.1.spec.ts`, `cockpit-research-9.spec.ts`, `cockpit-studio-hub.spec.ts`, `cockpit-a3-research.spec.ts`, and any `scripts/verify-phase-*.mjs` string check that greps these labels
- `apps/web/test/**` for new unit tests
- `docs/cloud/log/CLOUD-D1.md`

## Forbidden

- Data, contracts, BFF routes, `packages/**`
- `VoiceHudShell.tsx`, `TypedComposer.tsx`, `ConfirmCard.tsx` (C1), `components/reports/**` except the two honesty files (C6), `components/cockpit/**` (C2)
- Purple gradients; removing `SIMULATED` / `Fixture` badges (honesty labels stay)

## Tests

- Unit: data-mode chip returns `FIXTURE` when `ZEREF_BFF_FIXTURE=1`, `LIVE` otherwise (and `STALE` per data-age rule).
- `report-view.test.mjs`: `vsCohort: "inline"` → categorical item with no numeric value; unknown → "Not enough history"; cited-facts label reads "Facts cited: N".
- `projector-d1.spec.ts` at 1920×1080 over `/cockpit`, `/cockpit/studio`, `/cockpit/reports`, `/cockpit/reports?artifact=<fixture>`, `/cockpit/research`:
  - body text has no `/Phase \d/`, `ACCESS_TOKEN`, `stub telemetry`, `VS INLINE`;
  - smallest computed `font-size` of visible text nodes ≥ 13 px (evaluate `getComputedStyle`), not eyeballed;
  - `document.documentElement.scrollWidth <= innerWidth` (no horizontal scroll) and no panel with `scrollWidth > clientWidth` clipping.

## Verify (repo root)

```bash
export ZEREF_BFF_FIXTURE=1 ZEREF_LLM_MOCK=1 ZEREF_JOB_ENQUEUE_MOCK=1 ZEREF_PHASE51_UI=1 ZEREF_PHASE61_UI=1
npm run build && npm run lint && npm test -w @zeref/web
npm -w @zeref/web run test:e2e -- cockpit-hud-5.1 cockpit-hud-6.1 cockpit-studio-hub cockpit-research-9 cockpit-a3-research cockpit-layout
```

## Acceptance

- [ ] No developer jargon visible on any cockpit screen; honesty badges kept
- [ ] Smallest label ≥ 13 px at 1080p; before/after screenshots in PR
- [ ] CI green
