# CLOUD-C0 — CI green (gate)

- Agent: grok-cloud
- Branch: cloud/c0-ci-green
- PR: https://github.com/mohammedumar9919/zeref/pull/20
- Status: pr_ready

## Done

- Root cause: GitHub run `36353883691` (main, 2026-09-27) failed in step **Verify Phase 5** (`npm run verify:phase-5`), not in a later phase. Unit tests in that step passed (131/131). Playwright then printed only `Error: Timed out waiting 120000ms from config.webServer.` with no Next stderr, which means the webServer process was still running. `apps/web/playwright.config.ts` probes `http://127.0.0.1:${PLAYWRIGHT_PORT}/cockpit` (default **3099**) and sets `PORT`, but `npm run start` is `next start --port 3000` (commit `319f9e1`, 2026-09-13) and that flag overrides `PORT`. Next stayed up on 3000, so the 3099 readiness check never succeeded. The same config is what later verify steps and the P8 hotfix use, so they never started. The webServer command now runs `npx --no-install next start --hostname 127.0.0.1 --port ${PORT}`.
- `packages/db/test/migrations.test.mjs` no longer spawns `docker compose up` when `DATABASE_URL` is set or `CI` is `true`/`1`. That was the `Bind for 0.0.0.0:5432 failed` noise in Verify Phase 1, 3, and 4 of the same run. The Postgres integration suite still runs when `DATABASE_URL` is set. It skips when `DATABASE_URL` is unset and Docker is unavailable.
- Council (failures-checklist): no Playwright skip, no assertion removed, no CI step removed, no `continue-on-error`, no app code under `apps/web/app/**`, `apps/web/components/**`, or package `src/**`.

## Tests

- `npm ci` — pass
- `npm run build` — pass (Next.js 15.5.18)
- `npm run lint` — pass
- `npm test -w @zeref/db` — pass (5 guard tests; migration suite skipped: DATABASE_URL unset and Docker unavailable)
- Local readiness: `next start --hostname 127.0.0.1 --port 3099` ready in 373ms; `GET /cockpit` returned 200; port 3000 was down
- `npm -w @zeref/web run test:e2e:install` then `CI=true` + fixture mocks `npm -w @zeref/web run test:e2e -- e2e/cockpit-layout.spec.ts` — 11 passed (1 flaky C48 globe strict-mode retry, then pass). WebServer came up; this was not the 120s timeout.
- CI: `gh pr checks 20 --watch` — see PR

## Not done / blocked

- None in allowed paths. `apps/web/package.json` `start` still pins port 3000 for the laptop demo scripts; Playwright no longer calls that script.

## Laptop follow-up

- Planner merges first; wave-1 branches (C1, C3, C6) are cut after this merge.
- Planner updates QUEUE, AGENT_LOG, and CURRENT_STATE.
