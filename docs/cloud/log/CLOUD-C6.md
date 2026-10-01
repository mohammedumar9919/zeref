# CLOUD-C6 — Engagement trend chart

- Agent: lead (local; the C6 worker agent crashed)
- Branch: cloud/c6-pro-charts (based on PR #24 `cloud/d1-projector-polish`)
- Status: PR_READY

## Done

- Contract `phase14/engagement-trend.ts` (`PHASE14_CONTRACT_VERSION` 14.0.0): up to 30 points, sorted ascending, each with `timeBasis` `published` or `collected`, nullable `engagementScore`, plus `median`, `source` and `insufficientData` (fewer than 3 scored posts).
- Fixture `fixtures/phase-14/engagement-trend.json` (8 sample posts).
- BFF `lib/reports/engagement-trend-bff.ts`: fixture mode loads the fixture; live mode joins metric facts to normalized entities and snapshots, one point per post. It uses the post timestamp when available and otherwise the collect time, labelled "collected". Without a database it returns 500 with a message, never an empty "live" series.
- `GET /api/v1/reports/engagement-trend`.
- `TrendLineChart` (pure SVG): line of engagement per post, dashed amber "Your median" line, Fixture badge, an insufficient-data state, and a note when points use collect time.
- Reports hub renders the chart above the report list (server-side fetch in `app/cockpit/reports/page.tsx`).

## Tests

- `npm test -w @zeref/contracts` — 108 pass (includes `engagement-trend.test.mjs`)
- `node --import tsx --test test/chart-math.test.mjs test/engagement-trend-bff.test.mjs test/report-view.test.mjs` — 14 pass
- `npm run build -w @zeref/web` — pass
- Playwright (fixture, server on 3099 with `ZEREF_PLAYWRIGHT_REUSE=1`): reports-charts-c6, cockpit-reports-hub, projector-d1, cockpit-hud-6.1 — 13 passed (re-verifies D1's reports-hub copy fix)

## Deviations

- No trend vs competitors: competitor data is fixture-only until Instagram is connected, so the chart compares posts to your own median only.
- `docs/api-contracts.md` entry left for the planner update after merge.
- Root `npm run lint` fails locally with TS6310 (`tsc -b --noEmit` on referenced projects), not caused by this change; `next build` type-checks the web app.
