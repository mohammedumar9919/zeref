# CLOUD-K1 — Kernel gate hardening (confirm grants + fail-closed tools)

**Queue ID:** CLOUD-K1  
**Source:** security council blockers, `docs/superpowers/plans/2026-09-30-vision-intake.md` §7  
**Branch:** `cloud/k1-kernel-gate`  
**Council:** Stage 2 review required (kernel risk gate, `api-contracts.md`). Hold merge until after demo rehearsal.

## Goal

1. One `confirmed: true` must not approve every write-high call in a run. A confirm is bound to `{ runId, toolName, argsHash }` and used once.
2. Unknown tools fail closed (today `descriptor?.riskTier ?? "read"`).

## Allowed paths

- `packages/jarvis-kernel/src/core/**`, `packages/jarvis-kernel/src/index.ts`, `packages/jarvis-kernel/test/**`
- `apps/web/lib/jarvis/agent-runtime.ts`, `apps/web/lib/jarvis/confirm-grants.ts` (create)
- `apps/web/app/api/v1/jarvis/run/route.ts`, `apps/web/lib/voice/handle-turn.ts`
- `apps/web/test/**` (this work only), `docs/api-contracts.md`, this card, `docs/cloud/log/CLOUD-K1.md`

## Forbidden

`apps/web/lib/jarvis/llm-port.ts`, `apps/web/lib/jarvis/zeref-context.ts`, `apps/web/lib/jobs/**`, `packages/contracts/**`, `apps/web/components/**`, any risk tier in `zeref/tool-descriptors.ts`, `eval/jarvis/**`, `.cursor/plans/**`. Client components must not import `@zeref/jarvis-kernel` (C30).

## Tests (write first)

- Kernel: grant for tool A does not approve B; same tool + different args rejected; other runId rejected; grant consumed after one use; bare `confirmed: true` approves nothing; unknown tool not executed.
- Web: confirm with unknown / expired / missing runId → expired reply, no tool; replay of the same runId refused; enqueue → confirm → "Job enqueued successfully."; vault forget confirm still works.

## Verify (PowerShell, repo root)

```powershell
$env:ZEREF_BFF_FIXTURE='1'; $env:ZEREF_LLM_MOCK='1'; $env:ZEREF_MEMORY_MOCK='1'; $env:ZEREF_JOB_ENQUEUE_MOCK='1'; $env:ZEREF_PHASE11_AGENT='1'
npm run build -w @zeref/jarvis-kernel; npm test -w @zeref/jarvis-kernel
cd apps/web; npm test; node --import tsx ../../eval/jarvis/run-eval.mjs; cd ../..
```

## Acceptance

- [ ] Eval 10/10 task + tool, 0 unsafe, j4/j10 still `awaiting_confirm`
- [ ] E2E `cockpit-composer-c1`, `jarvis-agent-11` green in CI
- [ ] Council Stage 2 sign-off
