# CLOUD-C0 — CI green (gate)

- Agent: grok-cloud
- Branch: cloud/c0-ci-green
- PR: https://github.com/mohammedumar9919/zeref/pull/20
- Status: pr_ready

## Done

- Playwright webServer timeout (main run `36353883691`, step Verify Phase 5): readiness is `http://127.0.0.1:${PLAYWRIGHT_PORT}/cockpit` (default 3099) while `npm run start` is `next start --port 3000`. The webServer command is now `npx --no-install next start --hostname 127.0.0.1 --port ${PORT}`.
- `packages/db/test/migrations.test.mjs` does not spawn `docker compose up` when `DATABASE_URL` is set or `CI` is `true`/`1`.
- The copied `@zeref/instagram` web import check now follows the jarvis-kernel shape in C30, C50, C59, C70, and C78. The import is allowed only in server-only modules under `apps/web/lib/jarvis/**` and `apps/web/lib/ops/**`. It stays blocked under `apps/web/app/**`, `apps/web/components/**`, any file marked `use client`, and every other `apps/web` path. ADR-018 notes the C30 rule was amended on 2026-09-27 because of the Track B Graph work, and that the same amendment applies to C50, C59, C70, and C78. The four `apps/web/lib` files were not edited. C14 and C19 were not changed.
- C91 in `apps/web/e2e/cockpit-hud-6.1.spec.ts` no longer hardcodes `Phase 6.1`. The header intentionally shows the current phase from `getActivePhaseLabel()`, which reads `Phase ${PHASE10_CONTRACT_VERSION.split(".")[0]}` (currently `Phase 10`). The assertion is an exact text match on that template, importing `PHASE10_CONTRACT_VERSION` from `@zeref/contracts`. No app code was changed.

## Tests

- `npm ci`, `npm run build`, `npm run lint` — pass (earlier on this branch)
- `npm test -w @zeref/db` — pass (5 guard tests; migration suite skipped without `DATABASE_URL`)
- Local `CI=true` `node scripts/verify-phase-5.mjs` — exit 0, `[verify:phase-5] OK`
- Local `ZEREF_PHASE61_UI=1` `npm -w @zeref/web run test:e2e -- e2e/cockpit-hud-6.1.spec.ts` — 4 passed, including C91
- Prior CI on `ca13dd3` failed Verify Phase 6.1 on the stale `Phase 6.1` literal (runs `36365427336`, `36365429605`)

## Not done / blocked

- Waiting on `gh pr checks 20 --watch` for the whole Phase 0–9 gate after the C91 spec update.

## Laptop follow-up

- Planner merges first; wave-1 branches (C1, C3, C6) are cut after this merge.
- Planner updates QUEUE, AGENT_LOG, and CURRENT_STATE.
