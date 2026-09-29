# CLOUD-D2 — Jarvis answers with real content (demo mode)

**Queue ID:** CLOUD-D2  
**Status:** see [../QUEUE.md](../QUEUE.md)  
**Remote:** Yes (fixture)  
**Depends on:** CLOUD-C1 and CLOUD-C3 merged (C3 owns `llm-port.ts` before D2; C2 rebases onto D2 and adds its regex after)  
**Branch prefix:** `cloud/d2-`

## Goal

In demo / mock mode Jarvis replies are content-free (review 2026-09-28):

| Question | Today | Should be |
|----------|-------|-----------|
| "what is the latest report headline" | "Your latest elite report headline is on the reports panel." | The headline text from the tool result |
| "what did I ask you to remember" | "Here's what I found in memory." | The top 1–3 memory items (or "Nothing saved yet") |
| "how did my last post do compared to my usual" | "Right then — I heard: …" (echo) | Route to the report / insights read tool and answer with score vs baseline |
| "delete all my data" | echo | "I can't delete everything. I can forget a specific vault item — say 'forget …'." |
| enqueue confirm | "Shall I proceed with enqueue job?" | "Shall I queue a report job? Say yes to confirm." (human label per tool) — same label on C1's `ConfirmCard` |
| any unrecognised question | "Right then — I heard: …" (echo) | "I can tell you your latest report, what you've pinned, how a post did vs your usual, or queue a report." |
| "pin this: post reels at 7pm" then "what have you pinned" | vault tools (C3) | Reply contains "post reels at 7pm" |
| post vs usual when baseline n < 5 | — | Says "low confidence — not enough history yet" (never a bare comparison) |

The mock final-text builder lives in `apps/web/lib/jarvis/llm-port.ts` (≈ lines 185–225) and ignores tool results. The confirm text lives in `apps/web/lib/jarvis/agent-runtime.ts:103` and `packages/jarvis-kernel/src/core/react-loop.ts:172`.

## Allowed paths

- `apps/web/lib/jarvis/llm-port.ts` — mock routing + mock final text built **from tool results**
- `apps/web/lib/jarvis/agent-runtime.ts` — `confirmResultText` human labels
- `packages/jarvis-kernel/src/core/react-loop.ts` — confirm message uses the same label map
- `packages/jarvis-kernel/src/zeref/tool-labels.ts` (create) — `{ enqueue_job: "queue a {jobType} job", create_calendar_event: "add this to the calendar", vault_forget: "forget that item", … }`
- `packages/jarvis-kernel/src/index.ts` / `zeref/index.ts` — export `toolLabel(name, args)` only
- `apps/web/components/hud/ConfirmCard.tsx` — show `toolLabel()` instead of the raw tool name (C1 merged before D2)
- `apps/web/test/jarvis/agent-runtime.test.mjs` — update the `/Shall I proceed/` assertion (l.100) to the new exact wording
- `apps/web/test/jarvis/mock-answers.test.mjs` (create), `packages/jarvis-kernel/test/tool-labels.test.mjs` (create)
- `docs/cloud/log/CLOUD-D2.md`

## Forbidden

- `eval/jarvis/**` (golden set is human-approved); tool risk tiers; live LLM prompts / persona
- Inventing numbers not present in tool results

## Tests (write first)

- Each row of the table above as a mock-mode test through `runJarvisAgent` (fixture data): answer contains the fixture headline text / saved memory text / score; confirm text uses the label map.
- Delete-all: refusal text **and** no write tool executed **and** no `pendingConfirm`.
- Existing `jarvis-agent-11` e2e + unit tests still green.

## Verify (repo root)

```bash
export ZEREF_BFF_FIXTURE=1 ZEREF_LLM_MOCK=1 ZEREF_MEMORY_MOCK=1 ZEREF_JOB_ENQUEUE_MOCK=1 ZEREF_PHASE11_AGENT=1
npm run build && npm run lint
npm test -w @zeref/web -w @zeref/jarvis-kernel
npm -w @zeref/web run test:e2e -- jarvis-agent-11 cockpit-composer-c1
```

## Acceptance

- [ ] Every table row answered with real fixture content; no echo fallback for these intents
- [ ] CI green (CI runs the eval harness inside verify:phase-11 — must stay ≥80/80, 0 unsafe)
