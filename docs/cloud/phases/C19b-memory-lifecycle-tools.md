# C19b — Memory lifecycle: Jarvis tools + history card

Part 2 of C19. Builds on C19a (merged: `supersedeEntry`, `archiveEntries`, `proposeStaleArchive`, `getEntryHistory` in `@zeref/zeref-memory`).

**Council review required** (contracts `JarvisToolNameSchema`, kernel tool descriptors / risk tiers).

## Operator decision (binding)

Exact same-key corrections stay automatic (C19a). Only **explicit replace** requests and **stale-archive** proposals ask first.

## New Jarvis tools

| Tool | Tier | Does |
|------|------|------|
| `memory_history` | read | `getEntryHistory(id)`; id or content match like `vault_forget` target resolution |
| `memory_propose_archive` | read | `proposeStaleArchive({olderThanDays, limit})`; writes nothing |
| `memory_supersede` | **write-high** (confirm) | `supersedeEntry(oldId, {content})` — "replace X with Y?" |
| `memory_archive` | **write-high** (confirm) | `archiveEntries(ids)` — only ids the operator confirms |

- Add names to `JarvisToolNameSchema` (`packages/contracts/src/phase6/jarvis-turn.ts`), descriptors (`tool-descriptors.ts`), executor (`tool-executor.ts`), adapters (memory/vault port: extend the kernel's vault/memory port type + `apps/web/lib/jarvis/memory-port.ts`), plain-English confirm labels in `tool-labels.ts` (e.g. "Shall I replace "7pm posting" with "9pm posting"? Say yes to confirm.", "Shall I archive 3 old memories? Say yes to confirm.").
- K1 confirm grants already bind run + tool + args hash — confirm must name exactly what will change.
- Mock LLM (`apps/web/lib/jarvis/llm-port.ts`): routing for "replace … with …", "history of …", "what's stale / archive old memories"; finish text built from tool results only.
- Fact cards (`apps/web/lib/jarvis/fact-cards.ts`): `memory_history` → "Memory history" card (up to 6 versions, newest last, marks superseded/archived); `memory_propose_archive` → "Stale memories" card; `memory_supersede` → "Replaced"; `memory_archive` → "Archived N".
- Nothing ever deletes in these paths. `vault_forget` unchanged.

## Version packs (C7)

`config/jarvis/packs/v1.json` is immutable — do not edit it. Add `config/jarvis/candidates/v2.json` = v1 + the four tools at the tiers above. Update `scripts/test/jarvis-pack.test.mjs` seed test: live descriptor tiers must equal `candidates/v2.json` exactly, and v1 must be a subset with equal tiers. Operator promotes v2 by hand (`--candidate v2 --approve`).

## Rules

- Do not edit `eval/jarvis/golden-tasks.jsonl` (new golden cases need human sign-off — propose them in the PR body instead). Eval must stay 10/10, 0 unsafe.
- C30: client components never import kernel / instagram / whisper / zeref-memory.
- No db migration, no worker changes.
