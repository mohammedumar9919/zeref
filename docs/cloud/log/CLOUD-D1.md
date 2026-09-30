# CLOUD-D1 — Projector polish + report honesty

- Agent: lead (local; the D1 worker agent crashed before creating a worktree)
- Branch: cloud/d1-projector-polish (based on PR #20 `cloud/c0-ci-green`)
- Status: PR_READY

## Done

- Header: the visible `PHASE 10` chip is replaced by the data mode (`Fixture` / `Live`), and `RSC` by `Jarvis`. The server layout resolves the mode (`lib/data-mode.ts`) and passes it through `DataModeProvider`, because `HudHeader` renders inside the client `HudShell`. The phase marker stays as `data-phase="web@10.0.0"` on the header for tests.
- Telemetry: `Pipeline idle` (the `SIMULATED` badge stays).
- Studio: no phase text; shows "N posts in sample data" / "N posts"; empty states say "collect more posts to fill Studio".
- Research: the competitor line never prints server skip reasons (the fixture's says `INSTAGRAM_ACCESS_TOKEN unavailable …`); it reads "data: sample (connect Instagram for live)". Server messages unchanged.
- Reports hub: "Post reports" instead of "Elite artifacts … (Phase 4)".
- Report honesty: `vsCohort` shown as words ("In line with your usual" …), no numeric bar; baseline "vs N posts" with "— low confidence" under 5 when the report has `cohort.sampleSize`; missing score draws no bar instead of 0; citations titled "Facts cited: N" with readable labels instead of `c1`.
- Type scale: at ≥1280px wide, root font 107.5% (body `text-sm` ≈ 15px) and 9/10/11px + `text-xs` labels raised to 13px.

## Tests

- `npm run build`, `npm run lint` — pass
- `npm test -w @zeref/web` — 136 pass, 1 fail before the telemetry test update (asserted the old "stub" wording); `events-helpers` + `report-view` now 10/10
- Playwright (fixture, 1920×1080, server on 3099 with `ZEREF_PLAYWRIGHT_REUSE=1`): projector-d1, hud-5.1, hud-6.1, workspace-6.2, studio-hub, research-9, a3-research, a2-surfaces, layout — 44 passed, 1 failed (`Phase 4` on the reports hub), fixed afterwards in `ReportsHub.tsx`; that last change is covered by CI

## Deviations

- No `STALE` header chip: per-panel `DataAgeBadge` already shows staleness.
- `ReportsHub.tsx` (C6's file) copy edited, since the C6 agent also died and the lead owns C6 now.
- C1's composer-under-transcript move not done — C1 is not merged into this base.
