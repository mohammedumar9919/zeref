# CLOUD-C0 — CI green (gate)

- Agent: grok-cloud
- Branch: cloud/c0-ci-green
- PR: https://github.com/mohammedumar9919/zeref/pull/20
- Status: pr_ready

## Done

- Playwright webServer timeout (main run `36353883691`, step Verify Phase 5): readiness is `http://127.0.0.1:${PLAYWRIGHT_PORT}/cockpit` (default 3099) while `npm run start` is `next start --port 3000`. The Playwright webServer command is now `npx --no-install next start --hostname 127.0.0.1 --port ${PORT}`.
- `packages/db/test/migrations.test.mjs` does not spawn `docker compose up` when `DATABASE_URL` is set or `CI` is `true`/`1`.
- The copied `@zeref/instagram` web import check now follows the jarvis-kernel shape in C30, C50, C59, C70, and C78. Allowed only in server-only modules under `apps/web/lib/jarvis/**` and `apps/web/lib/ops/**`. Blocked under `apps/web/app/**`, `apps/web/components/**`, any `use client` file, and every other `apps/web` path.
- C91 in `apps/web/e2e/cockpit-hud-6.1.spec.ts` no longer hardcodes `Phase 6.1`. The header shows `getActivePhaseLabel()`, which is `Phase ${PHASE10_CONTRACT_VERSION.split(".")[0]}` (currently `Phase 10`). The assertion is an exact text match on that template, importing `PHASE10_CONTRACT_VERSION` from `@zeref/contracts`. No app code was changed. Verify Phase 5 inside run `36366409457` printed `[verify:phase-5] OK`.
- `scripts/verify-phase-10.mjs` owned server was `npm run start` (`next start --port 3000`) while C122 waits on `http://127.0.0.1:${PLAYWRIGHT_PORT}/cockpit` (default 3099). The spawn now appends `--hostname 127.0.0.1 --port <PLAYWRIGHT_PORT|PORT|3099>`. Local check: Next printed `Local: http://127.0.0.1:3099` and `GET /cockpit` returned 200. Nothing else in that script changed.

## Tests

- `npm ci`, `npm run build`, `npm run lint` — pass (earlier on this branch)
- `npm test -w @zeref/db` — pass
- Local `CI=true` `node scripts/verify-phase-5.mjs` — exit 0
- Local `ZEREF_PHASE61_UI=1` `npm -w @zeref/web run test:e2e -- e2e/cockpit-hud-6.1.spec.ts` — 4 passed, including C91
- Prior CI on `09bbbd0` failed Verify Phase 10 with `C122: web server not ready for perf-smoke/e2e: Timed out waiting for http://127.0.0.1:3099/cockpit` (runs `36366409457`, `36366412561`).

## Not done / blocked

- Waiting on `gh pr checks 20 --watch` after the phase 10 port change. Later verify scripts (10.5, 11, 12) still spawn plain `npm run start` and will be changed only if CI shows the same 3099 timeout.

## Laptop follow-up

- `apps/web/package.json` `start` still pins port 3000 for the laptop demo. Phase 10's verify spawn overrides that with `--port`.
- Planner merges first; wave-1 branches (C1, C3, C6) are cut after this merge.
- Planner updates QUEUE, AGENT_LOG, and CURRENT_STATE.
