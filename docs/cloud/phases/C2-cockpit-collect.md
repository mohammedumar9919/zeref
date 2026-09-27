# CLOUD-C2 — Confirm-gated cockpit collect (Jarvis-only path)

**Queue ID:** CLOUD-C2  
**Status:** see [../QUEUE.md](../QUEUE.md)  
**Remote:** Yes (fixture) · live collect = laptop  
**Depends on:** CLOUD-C1 **and** CLOUD-C3 merged  
**Branch prefix:** `cloud/c2-`  
**Council review:** mandatory (ADR-030 amendment, contracts, enqueue path)  
**Phase flags:** `ZEREF_PHASE11_AGENT=1 ZEREF_PHASE51_UI=1 ZEREF_JOB_ENQUEUE_MOCK=1`

## Goal

A **"Refresh data"** button in the Reports panel that asks Jarvis to collect the latest Instagram data. It goes through Jarvis's `enqueue_job` **write-high confirm** gate and audit log. The public `POST /api/v1/jobs/enqueue` route stays unable to enqueue `collect`.

## Current constraint (council finding)

ADR-030 (`docs/governance/adr/ADR-030-bff-job-enqueue.md`) keeps `collect` **CLI-only**: `UiJobTypeSchema` (`packages/contracts/src/phase8/jobs.ts`) excludes it, and `enqueueJob` (`apps/web/lib/jobs/enqueue-job.ts`) Zod-parses **before** the mock short-circuit. Jarvis reaches the same function through `apps/web/lib/jarvis/zeref-context.ts` (`enqueueJob(body)`).

## Design (decided — option A, Jarvis-confirmed collect)

1. Contracts: `JarvisJobTypeSchema = (isPhase9ResearchActive() ? UiJobTypeSchemaV9 : UiJobTypeSchema) ∪ {'collect'}` (keep `research` reachable via Jarvis when `ZEREF_PHASE9_RESEARCH=1`; build both variants in contracts, pick at call site) and `JarvisJobEnqueueRequestSchema` in `packages/contracts/src/phase11/jarvis-jobs.ts` (create), exported in the **phase11** block of `packages/contracts/src/index.ts`.
2. `enqueueJob(rawBody, opts?: { via?: 'jarvis-confirmed' })` — uses the Jarvis schema **only** when `opts.via === 'jarvis-confirmed'`; default path unchanged (UI still rejects `collect`).
3. `zeref-context.ts` `enqueueJob(...)` passes `{ via: 'jarvis-confirmed' }`. That code only runs after the kernel's write-high confirm, so the gate is preserved.
4. Collect payload: read `apps/worker/src/jobs/collect.ts` for the required fields; resolve them like `scripts/uat-collect-recent.mjs`. In fixture / `ZEREF_JOB_ENQUEUE_MOCK=1`, the mock returns a SIMULATED result **after** schema parse.
5. Mock routing (`apps/web/lib/jarvis/llm-port.ts`): `/(collect|refresh).*(instagram|data)/i` → `enqueue_job { jobType: 'collect' }`, placed **before** the existing report-enqueue regex.
6. UI: button → C1 `sendTypedTurn("collect latest instagram data")` → C1 `ConfirmCard` inline → Confirm → `confirmTypedTurn(…, runId)` → result + SIMULATED badge in fixture.
7. Write the ADR-030 amendment section: "2026-09 C2 — `collect` allowed only via Jarvis confirmed write-high path; UI route unchanged."

## Allowed paths

- `packages/contracts/src/phase11/jarvis-jobs.ts` (create), `phase11/index.ts`, `packages/contracts/src/index.ts` (phase11 block only)
- `apps/web/lib/jobs/enqueue-job.ts` — `opts.via` branch + a `collect` case in `buildWorkerJobPayload` using `CollectJobInputSchema` (non-mock path)
- `apps/web/lib/jarvis/zeref-context.ts` — pass `via` only
- `apps/web/lib/jarvis/llm-port.ts` — collect regex only
- `apps/web/components/cockpit/panels/CollectRefreshButton.tsx` (create) — `data-testid="cockpit-collect-refresh"`
- `apps/web/components/cockpit/ReportsPanel.tsx` — mount the button
- `docs/governance/adr/ADR-030-bff-job-enqueue.md` — append amendment section
- `apps/web/test/jarvis/collect-routing.test.mjs`, `apps/web/test/enqueue-job-via.test.mjs` (create), `apps/web/e2e/cockpit-collect-c2.spec.ts` (create)
- `docs/cloud/log/CLOUD-C2.md` (create)

## Forbidden

- Adding `collect` to `UiJobTypeSchema` or accepting it on `POST /api/v1/jobs/enqueue`
- Client `fetch('/api/v1/jobs/enqueue')` or direct pg-boss from the UI
- Editing `ConfirmCard.tsx` / `TypedComposer.tsx` / `typed-turn.ts` / `VoiceHudShell.tsx` (C1-owned; reuse)
- Lowering `enqueue_job` from `write-high`; Instagram scraping; live collect in cloud

## Tests (write first)

1. `enqueue-job-via.test.mjs`: `{jobType:'collect'}` without `via` → rejected (400-class error); with `via:'jarvis-confirmed'` + mock → SIMULATED success; `POST /api/v1/jobs/enqueue` with collect → 400 (regression).
2. `collect-routing.test.mjs`: "collect latest instagram data" → `enqueue_job` `jobType:'collect'`; "enqueue a report job" still → `jobType:'report'`.
3. `cockpit-collect-c2.spec.ts` (`test.skip` unless `ZEREF_PHASE11_AGENT=1`): click refresh → confirm card → Cancel → no result; click again → Confirm → result text + SIMULATED badge.

## Verify (repo root)

```bash
export ZEREF_BFF_FIXTURE=1 ZEREF_LLM_MOCK=1 ZEREF_MEMORY_MOCK=1 ZEREF_JOB_ENQUEUE_MOCK=1 ZEREF_TTS_MOCK=1 ZEREF_WHISPER_MOCK=1 ZEREF_PHASE11_AGENT=1 ZEREF_PHASE51_UI=1
npm run build && npm run lint
npm test -w @zeref/contracts -w @zeref/web -w @zeref/jarvis-kernel
node eval/jarvis/run-eval.mjs          # ≥80 % task, ≥80 % tool, 0 unsafe; j4 still awaiting_confirm
npm -w @zeref/web run test:e2e:install
npm -w @zeref/web run test:e2e -- cockpit-collect-c2 cockpit-composer-c1 jarvis-agent-11
```

## Acceptance

- [ ] `collect` reachable only through Jarvis confirmed write-high; UI route still rejects it
- [ ] Audit row written; ADR-030 amended; eval unchanged; CI green

## Laptop follow-up

- Live stack (`live-data-start.ps1`): Refresh → Confirm → worker collects → Studio shows a newer post (compare with B5 script).
