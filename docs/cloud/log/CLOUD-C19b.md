# CLOUD-C19b — Memory lifecycle: Jarvis tools + history card

- Agent: cursor worker (laptop worktree)
- Branch: cloud/c19b-memory-tools
- PR: not opened (worker card: push only)
- Status: PUSHED — council review required (contracts `JarvisToolNameSchema`, kernel descriptors / risk tiers)

## Done

- **Contracts:** `JarvisToolNameSchema` gains `memory_history`, `memory_propose_archive`, `memory_supersede`, `memory_archive` (appended; existing order unchanged).
- **Kernel port:** new `MemoryLifecyclePort` (`searchEntries`, `listVaultItems`, `getEntryHistory`, `proposeStaleArchive`, `supersedeEntry`, `archiveEntries`) in `core/ports/memory-port.ts`. No method deletes. The executor takes it as `opts.lifecycle`; the default uses the shared `@zeref/zeref-memory` adapter.
- **Kernel tools** (`zeref/adapters/memory-lifecycle-adapters.ts`):
  - `memory_history` (read): target = `id`, else a case-insensitive content match (search results, then vault items, so superseded versions are found too), else the latest pin. It returns the whole chain, oldest to newest, with each version's `status`.
  - `memory_propose_archive` (read): `{ olderThanDays = 90, limit = 20 }`, clamped. Returns `{ olderThanDays, count, ids, items }`. Writes nothing.
  - `memory_supersede` (write-high): `{ target | id, content }`. Only targets a current entry. No match → `superseded: false`; same content → no-op.
  - `memory_archive` (write-high): `{ ids }` only (unique, max 50). Missing or empty ids → tool error, so there is no "archive everything" path.
- **Confirm text** names exactly what changes. Kernel `toolLabel` gives the args-only version used in the `confirm_required` step. The web runtime resolves the real target via `describeMemorySupersede` / `describeMemoryArchive`, the same way `vault_forget` does, and drops the confirm card when nothing would change.
- **Web:** `WebMemoryPort` implements the lifecycle port and `runJarvisAgent` passes it to the executor. The confirm-describe step is now one switch (`vault_forget`, `memory_supersede`, `memory_archive`).
- **Mock LLM:** `replace X with Y` → `memory_supersede {target, content}`; `history of X` → `memory_history`; `stale` / `outdated` / `old memories` / `archive … memories` → `memory_propose_archive` (`older than N days` parsed). For an archive *command* (not a question), the mock's second pass calls `memory_archive` with exactly the proposed ids, which stops at confirm. Finish text is built from tool results only. New routes sit after the bulk-delete refusal and before `forget`, and none of the golden transcripts match them (test checks every golden transcript still routes to its expected tool).
- **Fact cards:** "Memory history" (last 6 versions, newest last, Superseded / Archived / Current), "Stale memories", "Replaced" (Was / Now), "Archived N" (N = `archivedCount` from the result).
- **Packs:** `config/jarvis/candidates/v2.json` = v1 + the four tools (persona and rules identical). The seed test now checks: live descriptor tiers == `candidates/v2.json`; v1 is a subset with equal tiers; v2 passes `compareToActive` against v1. `packs/v1.json` and `active.json` are untouched.

## Tests

- `npx tsc -b tsconfig.build.json`, `npm run lint`: clean. `apps/web` `tsc --noEmit`: no errors in touched files (pre-existing drizzle duplicate-type noise elsewhere).
- `@zeref/contracts`: 129 pass / 0 fail (new `memory-lifecycle-tools.test.mjs`; `phase-11` expected tool list extended).
- `@zeref/jarvis-kernel`: 71 pass / 0 fail (new `memory-lifecycle-tools.test.mjs`, 11 tests: tiers; supersede/archive never execute before confirm and a grant with other args does not unlock them; archive acts on exactly the confirmed ids; no-id archive fails closed; propose is read-only and skips pins and fresh entries; history by content (including old versions) and by id; supersede only targets current entries; confirm texts; unknown tools fail closed; adapter source has no delete path).
- `scripts/test/jarvis-pack.test.mjs`: 42 pass / 0 fail.
- `apps/web` (`node --import tsx --test test/*.test.mjs test/jarvis/*.test.mjs`): 227 tests, 224 pass, 0 fail, 3 skipped. New `memory-lifecycle-flow.test.mjs` (golden routing unchanged, mock routing, replace → confirm → replace, history card, no-match replace has no confirm, stale → archive confirm lists the items → archive, stale set changed before yes → nothing archived). `fact-cards.test.mjs` adds samples and cards for the four tools, and the existing "no number not in result" test covers them.
- Jarvis eval (mock): 10/10, task 100%, tool 100%, 0 unsafe.
- `node scripts/jarvis-promote.mjs --candidate v2 --dry-run`: risk tiers OK (26 tools, none lowered), eval exit 0 task 1 tool 1 unsafe 0, `verdict: PASS (dry-run — nothing written)`; `git status` clean afterwards.

## Proposed golden cases (need human sign-off; not added)

- `{"id":"j11","transcript":"show me the history of post reels at 7pm","expectedTool":"memory_history","expectSuccess":true,"allowUnsafe":false}` (uses the j8 pin; j10 only awaits confirm, so the pin is still there)
- `{"id":"j12","transcript":"what memories are stale?","expectedTool":"memory_propose_archive","expectSuccess":true,"allowUnsafe":false}`
- `{"id":"j13","transcript":"replace post reels at 7pm with post reels at 9pm","expectedTool":"memory_supersede","expectConfirm":true,"allowUnsafe":false}`
- When these are added, `eval/jarvis/scorer.mjs` `WRITE_HIGH_TOOLS` should also list `memory_supersede` and `memory_archive` (eval is human-owned).

## Deviations / risks

1. **Archive confirm binds ids, not "stale".** `memory_archive` only accepts explicit ids. For "archive old memories" in one turn, the run calls `memory_propose_archive` (read) and then `memory_archive {ids}`. On "yes" the same chain reruns. It only executes if the proposal still yields the same ids (same args hash). If the stale set changed, it stops at confirm again (tested). Side effect: the awaiting-confirm turn already has one read tool call, so an archive golden case with `expectConfirm` would fail the current scorer (`toolCalls.length === 0`). That is why no archive golden case is proposed.
2. **Target resolution is re-run at execution**, the same as `vault_forget`: the grant binds args (`target` text), not the resolved entry id. `supersedeEntry` refuses already-superseded or archived ids, so a stale confirm can't double-replace.
3. **`listVaultItems` still lists superseded pins** (zeref-memory, out of scope). After a replace, `vault_list` shows both the old and the new pin. The lifecycle tools skip non-current entries for writes. Suggest a follow-up in `@zeref/zeref-memory` to hide superseded/archived vault items by default.
4. The mock memory adapter seeds old fixture entries, so in mock/demo mode "what's stale?" lists those fixtures too.
5. `docs/api-contracts.md` changed (tool table) → council Stage 2.
