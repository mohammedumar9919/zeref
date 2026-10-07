# CLOUD-C2 — Confirm-gated cockpit collect

Branch: `cloud/c2-cockpit-collect` · Council: mandatory (ADR-030 amendment, contracts, enqueue path)

## What changed

- **Contracts** (`packages/contracts/src/phase11/jarvis-jobs.ts`, exported in the phase11 block): `JarvisJobTypeSchema` / `V9` = UI allowlist ∪ `collect`; strict `JarvisJobEnqueueRequestSchema` / `V9` with optional `graphMediaId` / `shortcodes` collect targets.
- **Enqueue** (`apps/web/lib/jobs/enqueue-job.ts`): `enqueueJob(raw, { via: "jarvis-confirmed" })` uses the Jarvis schema; default path unchanged, so `POST /api/v1/jobs/enqueue` still rejects `collect` (400). Non-mock collect resolves the newest Graph media id server-side and maps to `CollectJobInputSchema`.
- **Jarvis** (`zeref-context.ts`): write context passes `via: "jarvis-confirmed"` (only reachable after the write-high confirm). `llm-port.ts`: `/(collect|refresh).*(instagram|data)/` → `enqueue_job { jobType: "collect" }` before the report regex; simulated collect answers "Collect queued — simulated in demo mode."
- **Label**: `toolLabel` → "collect your latest Instagram data", so the confirm reads "Shall I collect your latest Instagram data? Say yes to confirm."
- **UI**: `components/cockpit/panels/CollectRefreshButton.tsx` (`cockpit-collect-refresh`) in the Reports panel → typed Jarvis turn → shared `ConfirmCard` → Confirm with `runId` → result + `SIMULATED` badge. No client call to the enqueue route; no kernel import in the client (C30).
- **ADR-030** amendment appended.

## Deviations

- Worker agent stalled after most of the code; lead finished the e2e spec, ADR amendment, collect label and log.
- `packages/jarvis-kernel/src/zeref/tool-labels.ts` (+ its test): collect label (card did not list it; K1 does not touch this file).

## Verification (local)

- Kernel 51/51 · contracts 115/115 · web 178 pass, 0 fail, 1 skipped (Postgres outbox, no DB).
- Jarvis eval: 10/10 task, 10/10 tool, 0 unsafe; j4 still `awaiting_confirm`.
- E2E `cockpit-collect-c2`, `cockpit-composer-c1`, `jarvis-agent-11`: CI.

## Interaction with K1 (#30)

The button confirms with the `runId` returned by the first turn, so it works unchanged once K1's single-use grants land.
