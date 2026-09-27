# CLOUD-C0 — CI green (gate for Track C)

**Queue ID:** CLOUD-C0  
**Status:** see [../QUEUE.md](../QUEUE.md)  
**Remote:** Yes  
**Depends on:** CLOUD-B5 merged (PR #18)  
**Branch prefix:** `cloud/c0-`  
**Council review:** mandatory (touches CI + verify scripts)

## Goal

`main` CI (job named "Phase 0–9 gate" in `.github/workflows/ci.yml` — it also runs verify phase-10 … 12 and the P8 hotfix) has been red since 2026-09-14. The whole job must pass, not just the steps up to phase 9. Make it green **without deleting, skipping or weakening any test**. Every later Track C PR relies on CI as its gate.

## Known evidence (Planner, 2026-09-26)

1. **Real failure:** Playwright `Error: Timed out waiting 120000ms from config.webServer.` — `apps/web/playwright.config.ts` starts `npm run start` (`next start --port 3000`). The server never becomes ready in one of the verify steps. Known local symptom of the same class: `next start` fails with a `routesManifest.dataRoutes` error when `.next` is from a partial / dev build; a full `npm run build -w @zeref/web` fixes it.
2. **Noise, not the failure:** `packages/db/test/migrations.test.mjs` calls `docker compose up -d db` when Docker exists, which prints `Bind for 0.0.0.0:5432 failed` because CI already runs a Postgres service on 5432.
3. Get the full log: `gh run list --branch main --limit 1` then `gh run view <id> --log-failed`. Find which `Verify Phase N` step hits the timeout.

## Allowed paths

- `.github/workflows/ci.yml` — step order, a build step before e2e steps, timeouts, env
- `apps/web/playwright.config.ts` — `webServer` timeout / command / readiness URL
- `scripts/verify-phase-5.mjs` … `scripts/verify-phase-9.mjs`, `scripts/verify-hotfix-p8.mjs` — server start / build / port-free logic only
- `packages/db/test/migrations.test.mjs` — skip `docker compose up` when `DATABASE_URL` is set or `CI=true`
- `docs/cloud/log/CLOUD-C0.md` (create)

## Forbidden

- Deleting, `.skip`-ing, `test.fixme`-ing or loosening any assertion (ADR-018, failures-checklist "No skipping Playwright in CI")
- Removing CI steps or `continue-on-error`
- App code under `apps/web/app/**`, `apps/web/components/**`, packages `src/**` — unless the log proves a real build bug; then log it and stop for Planner approval
- `QUEUE.md`, `AGENT_LOG.md`, `CURRENT_STATE.md`

## Tests

- No new product tests. Add a guard in `migrations.test.mjs`: when `process.env.DATABASE_URL` is set, never spawn `docker compose up`.

## Verify

```bash
npm ci && npm run build && npm run lint
npm test -w @zeref/db          # skips DB cases without DATABASE_URL — must not error
gh pr checks <PR> --watch       # Phase 0-9 gate must be green
```

## Acceptance

- [ ] `Phase 0-9 gate` green on the PR
- [ ] No `Bind for 0.0.0.0:5432` lines in the CI log
- [ ] Diff contains zero removed / skipped assertions
- [ ] Log file written with root cause in one paragraph

## Laptop follow-up

- Planner merges first; all wave-1 branches are cut **after** this merge.
