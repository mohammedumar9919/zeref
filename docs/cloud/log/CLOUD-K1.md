# CLOUD-K1 log — kernel gate hardening

**Branch:** `cloud/k1-kernel-gate` (from `origin/main` 221b377)  
**Card:** [../phases/K1-kernel-gate.md](../phases/K1-kernel-gate.md)  
**Status:** PR open — council review required (kernel tiers); hold merge until after demo rehearsal.

## What changed

### Kernel (`packages/jarvis-kernel`)

- `core/permissions.ts`: new `ConfirmGrant = { runId, toolName, argsHash }`, `grantMatches(grant, call)`. `canExecuteTool(riskTier, grant, call)` — write-high needs a grant matching run, tool and args hash; a boolean is never accepted.
- `core/react-loop.ts`:
  - `AgentRunInput.confirmed` removed; replaced by `confirmGrant?: ConfirmGrant`. Callers still passing `confirmed: true` get no approval.
  - The grant is consumed after one write-high execution; a second write-high call in the same run stops at `awaiting_confirm`.
  - `PendingConfirm` now carries `argsHash` (`hashArgs(args)` from `core/audit.ts`). Confirm text still from `confirmPrompt()`.
  - Unknown tool (no descriptor in `input.tools`): not executed, no audit entry; emits a failed `tool_execute` step (`error: "unknown_tool"`) and finishes `completed` with `UNKNOWN_TOOL_REPLY` ("I can't run that tool."). No fallback to `read`.
- Exports: `ConfirmGrant`, `grantMatches`, `ToolCallIdentity`, `UNKNOWN_TOOL_REPLY` from `core`; `hashArgs`, `UNKNOWN_TOOL_REPLY`, `ConfirmGrant` from the package root.

### Web (`apps/web`)

- `lib/jarvis/confirm-grants.ts` (new): server-only in-memory store on `globalThis`, keyed by `runId`, TTL 5 min. `recordConfirmGrant`, `takeConfirmGrant` (removes on read — single use), `CONFIRM_EXPIRED_REPLY`.
- `lib/jarvis/agent-runtime.ts`:
  - `confirmed: true` → `takeConfirmGrant(runId)`; missing runId / no grant / expired → returns the expired reply (`completed`, no `pendingConfirm`, no tools, loop not run).
  - Grant passed to `runAgentLoop` as `confirmGrant` with the same runId.
  - Grant recorded only when the run ends `awaiting_confirm` **and** `pendingConfirm` is kept (after the `describeVaultForget` check).
  - Steps naming an unknown tool are not mapped onto the contract bus (the contract tool enum would reject them) and are excluded from `toolCalls`.

### Docs

- `docs/api-contracts.md`: new "Jarvis run + write-high confirm (K1)" section.
- This log + phase card.

## Deviations

- `apps/web/app/api/v1/jarvis/run/route.ts` and `apps/web/lib/voice/handle-turn.ts` were **not edited**: the route schema already accepts optional `runId` and forwards it, and voice "yes" already resends the stored `runId`. All enforcement lives in `runJarvisAgent`, so both paths get it. `typed-turn.ts` already sends `runId` (not edited).
- `apps/web/test/jarvis/agent-runtime.test.mjs` "executes write-high after confirmed resume" used a fresh runId with `confirmed: true`; it now blocks first and confirms with the returned runId (the old flow is exactly what K1 forbids).
- Known limitation (unchanged design): confirm works by replaying the transcript. If a confirmed run hits a *second* write-high call, the new grant is recorded for that call; replaying the transcript again will re-propose the first call, which no longer matches, so it asks again. Not reachable with the mock LLM (one write-high per transcript).
- The grant store is per server process (in-memory). Multi-instance deploys would need a shared store; out of scope for single-operator local use.

## Verification (local, Windows, fixture + mock env)

| Check | Result |
|-------|--------|
| `npm run build -w @zeref/jarvis-kernel` | OK |
| `npm test -w @zeref/jarvis-kernel` | 60 tests, 60 pass, 0 fail |
| `apps/web npm test` | 172 tests, 171 pass, 0 fail, 1 skipped (postgres outbox integration — no DB) |
| `eval/jarvis/run-eval.mjs` | 10/10 tasks; task-success 100%, tool-choice 100%, unsafe 0; j4 + j10 `awaiting_confirm` |
| Root `tsc -b tsconfig.build.json --noEmit` | clean |
| `apps/web tsc --noEmit` | no errors in touched files (existing drizzle duplicate-type noise only) |
| E2E `cockpit-composer-c1`, `jarvis-agent-11` | left to CI |

Note: a fresh worktree needs `npx tsc -b tsconfig.build.json` before `apps/web npm test` (web tests import other packages' `dist`).
