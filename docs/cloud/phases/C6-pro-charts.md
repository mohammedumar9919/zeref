# CLOUD-C6 — Pro charts v1 (per-post engagement trend + own median)

**Queue ID:** CLOUD-C6  
**Status:** see [../QUEUE.md](../QUEUE.md)  
**Remote:** Yes (fixture) · live query verified by CI Postgres + laptop  
**Depends on:** CLOUD-C0 merged  
**Branch prefix:** `cloud/c6-`  
**Council review:** mandatory (new contract + BFF route)  
**Skill:** `.cursor/skills/ui-ux-pro-max/SKILL.md`

## Goal

Reports only show hand-rolled bar charts (`apps/web/components/reports/ReportCharts.tsx`). Add a **per-post engagement trend line** with an **own-median reference line**, so Reports reads like a pro analytics product on a projector. No chart library.

## Why a new read route (council finding)

The elite report artifact (`EliteReportSchema`, `packages/contracts/src/phase4/elite.ts`) and cockpit slices (`CockpitStudioItemSchema`) have **no per-post time series**. The real series is: each normalized post entity → its publish `timestamp` (Graph media field in the snapshot / normalized payload) + its `engagementScore` (metric facts payload, `packages/contracts/src/phase3/metric-facts-payload.ts`). So C6 adds one **read-only** summary DTO and route. Never invent points.

## Design

- Contract `packages/contracts/src/phase14/engagement-trend.ts` (create) + `phase14/index.ts`:
  - `EngagementTrendPointSchema { entityId: uuid, title: string, publishedAt: datetime, engagementScore: number | null }`
  - `EngagementTrendSchema { points: Point[] (sorted by publishedAt asc, max 30), median: number | null, source: 'fixture' | 'live', insufficientData: boolean }`
  - `insufficientData = true` when fewer than 3 points have a non-null score
- Export via a **new `phase14` block appended at the end** of `packages/contracts/src/index.ts`. Do not touch other blocks (C3 edits the phase7 block in parallel).
- BFF `GET /api/v1/reports/engagement-trend` (create) → `lib/reports/engagement-trend-bff.ts`:
  - fixture mode (`ZEREF_BFF_FIXTURE=1`): read `fixtures/phase-14/engagement-trend.json` (create, ≥ 6 points, clearly fixture titles), `source: 'fixture'`
  - live: one SQL query joining normalized entities, their snapshot media timestamp and latest metric fact score — follow the query style in `apps/web/lib/cockpit-bff.ts` / `research-bff.ts`
  - errors → non-200 with message (failures-checklist: no silent empty data)
- Reports hub loads the trend **server-side** (RSC) — no mount-time client fetch.
- Median computed in a pure function, shown as a dashed amber line; data-age badge (`components/hud/DataAgeBadge.tsx`) beside the chart.

## Allowed paths

- `packages/contracts/src/phase14/engagement-trend.ts`, `phase14/index.ts` (create); `packages/contracts/src/index.ts` (append phase14 block only)
- `packages/contracts/test/engagement-trend.test.mjs` (create)
- `apps/web/app/api/v1/reports/engagement-trend/route.ts` (create)
- `apps/web/lib/reports/engagement-trend-bff.ts` (create)
- `fixtures/phase-14/engagement-trend.json` (create)
- `apps/web/components/reports/TrendLineChart.tsx` (create) — pure SVG (`viewBox`, `polyline`, dashed median `line`, `font-mono` axis labels), `role="img"` + `aria-label`, `data-testid="report-trend-engagement"`
- `apps/web/components/reports/chart-math.ts` (create) — `median(values)`, `scaleSeries(points, width, height, padding)`
- `apps/web/components/reports/ReportsHub.tsx` and `apps/web/app/cockpit/reports/page.tsx` — page loads the trend server-side and passes it as a prop to `ReportsHub`
- `apps/web/test/chart-math.test.mjs`, `apps/web/test/engagement-trend-bff.test.mjs` (create)
- Chart title reads "Engagement per post" + the `Fixture` badge in fixture mode; median value shown as a number next to the dashed line
- `apps/web/e2e/reports-charts-c6.spec.ts` (create)
- `docs/cloud/log/CLOUD-C6.md` (create)

## Forbidden

- New npm dependencies (recharts, chart.js, d3, …)
- Changing `EliteReportSchema` / report worker / pipeline tables
- `apps/web/components/hud/**`, `apps/web/components/cockpit/**`, `packages/zeref-memory/**`
- Client-side polling or mount-time `fetch` for the chart
- Purple / rainbow palettes (use `hud-cyan` line, `hud-muted` axes, amber median); animated fake "live" ticking

## Tests (write first)

1. `engagement-trend.test.mjs` (contracts): valid fixture parses; unsorted points rejected by the builder helper or sorted; `insufficientData` true with 2 scored points.
2. `chart-math.test.mjs`: `median([3,1,2]) === 2`, `median([1,2,3,4]) === 2.5`, `median([]) === null`; `scaleSeries` maps min→bottom, max→top within padding; single value → flat mid-line.
3. `engagement-trend-bff.test.mjs`: fixture mode returns `source: 'fixture'`, ≥ 6 points, correct median; live mode without `DATABASE_URL` → `test.skip`.
4. `reports-charts-c6.spec.ts` (Playwright, fixture; `test.skip` unless `ZEREF_BFF_FIXTURE=1`): reports hub shows `report-trend-engagement` with a `polyline` and a median line. (The `insufficientData` → "Not enough posts yet" state is covered in `engagement-trend-bff.test.mjs` / a component unit test, not e2e, since the fixture has ≥ 6 points.)


`report-view.ts` / `ReportCharts.tsx` are owned by **D1** this week (honesty fix) — do not edit them.

## Verify (repo root)

```bash
export ZEREF_BFF_FIXTURE=1 ZEREF_LLM_MOCK=1 ZEREF_JOB_ENQUEUE_MOCK=1 ZEREF_PHASE51_UI=1
npm run build && npm run lint
npm test -w @zeref/contracts -w @zeref/web
npm -w @zeref/web run test:e2e:install
npm -w @zeref/web run test:e2e -- reports-charts-c6 cockpit-reports-hub cockpit-a2-surfaces
```

## Acceptance

- [ ] Trend + median come from real rows (live) or labeled fixture — never invented
- [ ] No new deps; no client fetch storm; CI green
- [ ] Screenshot attached to PR (fixture)

## Laptop follow-up

- Live stack: Reports shows the 6+ collected posts from B5 on the trend line.
