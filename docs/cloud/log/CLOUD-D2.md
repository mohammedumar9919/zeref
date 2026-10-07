# CLOUD-D2 — Jarvis answers from real tool results

Branch: `cloud/d2-jarvis-answers` · Risk tier: kernel (council review required)

## What changed

- **Plain-English confirms.** New `packages/jarvis-kernel/src/zeref/tool-labels.ts` (`toolLabel`, `confirmPrompt`).
  The ReAct loop and `agent-runtime.ts` now say `Shall I queue a report job? Say yes to confirm.` instead of
  `Shall I proceed with enqueue_job?`. `ConfirmCard` shows the label (e.g. "Queue a report job").
- **Mock answers read the tool result** (`apps/web/lib/jarvis/llm-port.ts`):
  - headline → quotes the saved headline ("Ride log post shows solid engagement vs account baseline.");
  - "what did I ask you to remember" → `memory_search` with an empty query → top 3 items, or "Nothing saved yet";
  - "how did my last post do compared to my usual" → `get_report_artifact` (latest report) → score, vs-usual,
    and "Low confidence — not enough history yet" when the baseline has fewer than 5 posts (fixture: 1);
  - "delete all my data" / "forget everything" → refusal plus an offer to forget one item; no tool, no confirm;
  - unrecognised input → capability help instead of the "Right then — I heard:" echo.
- `get_report_artifact` with no id resolves to the latest report on the reports panel.

Risk tiers, golden tasks, scorer and live prompts are unchanged. No numbers are invented: every figure comes
from the tool result.

## Deviations from the card

- `packages/jarvis-kernel/package.json`: added a `./tool-labels` subpath export so the client
  `TypedComposer` can import the label helper without pulling server-only kernel deps.
- `apps/web/components/hud/TypedComposer.tsx`: passes `label` to `ConfirmCard` (the card itself needed no change).
- `apps/web/lib/jarvis/zeref-context.ts` (C2-owned): latest-artifact fallback in `getReportArtifact`.
- `apps/web/e2e/cockpit-composer-c1.spec.ts`: confirm-card assertion now expects the label and checks
  `data-tool-name="enqueue_job"`.
- Web memory port injection was not needed: `memory_search` already uses `createWebMemoryPort()`, and the vault
  uses the shared `@zeref/zeref-memory` adapter.

## Verification (local)

- `npm test -w @zeref/jarvis-kernel`: 51/51 pass (new `tool-labels.test.mjs`).
- `apps/web` `npm test`: 163 pass, 0 fail (new `test/jarvis/mock-answers.test.mjs`, 6 cases).
- Jarvis eval (mock + fixture): 10/10 task success, 10/10 tool choice, 0 unsafe.
- `tsc --noEmit` in `apps/web`: no new errors (existing drizzle duplicate-type errors only).
- E2E `cockpit-composer-c1` / `jarvis-agent-11`: left to CI.
