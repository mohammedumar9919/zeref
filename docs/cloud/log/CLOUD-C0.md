# CLOUD-C0 — CI green (gate)

- Agent: grok-cloud
- Branch: cloud/c0-ci-green
- PR: https://github.com/mohammedumar9919/zeref/pull/20
- Status: pr_ready

## Done

- Playwright webServer timeout (main run `36353883691`, step Verify Phase 5): readiness is `http://127.0.0.1:${PLAYWRIGHT_PORT}/cockpit` (default 3099) while `npm run start` is `next start --port 3000`. The webServer command is now `npx --no-install next start --hostname 127.0.0.1 --port ${PORT}`.
- `packages/db/test/migrations.test.mjs` does not spawn `docker compose up` when `DATABASE_URL` is set or `CI` is `true`/`1`.
- The copied `@zeref/instagram` web import check now follows the jarvis-kernel shape in C30, C50, C59, C70, and C78. The import is allowed only in server-only modules under `apps/web/lib/jarvis/**` and `apps/web/lib/ops/**`. It stays blocked under `apps/web/app/**`, `apps/web/components/**`, any file marked `use client`, and every other `apps/web` path. ADR-018 notes the C30 rule was amended on 2026-09-27 because of the Track B Graph work, and that the same amendment applies to C50, C59, C70, and C78. The four `apps/web/lib` files were not edited. C14 and C19 (worker-path guards in phase 3 and 4) were not changed.

## Tests

- `npm ci`, `npm run build`, `npm run lint` — pass (earlier on this branch)
- `npm test -w @zeref/db` — pass (5 guard tests; migration suite skipped without `DATABASE_URL`)
- Local `CI=true` `node scripts/verify-phase-5.mjs` — exit 0, `[verify:phase-5] OK`
- `node --check` on `verify-phase-5.1.mjs`, `verify-phase-6.mjs`, `verify-phase-7.mjs`, `verify-phase-8.mjs` — pass
- CI before this amendment: Phase 0–9 gate red on Verify Phase 5.1 C50 (runs `36364702330`, `36364706756`). Verify Phase 5 had already printed OK.

## Not done / blocked

- Waiting on `gh pr checks 20 --watch` for the whole Phase 0–9 gate after this amendment.

## Laptop follow-up

- Planner merges first; wave-1 branches (C1, C3, C6) are cut after this merge.
- Planner updates QUEUE, AGENT_LOG, and CURRENT_STATE.
