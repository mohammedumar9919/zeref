# CLOUD-C3 — Memory vault v0 (reuse `memory_entries`)

**Queue ID:** CLOUD-C3  
**Status:** see [../QUEUE.md](../QUEUE.md)  
**Remote:** Yes — **no migration** in this card  
**Depends on:** CLOUD-C0 merged  
**Branch prefix:** `cloud/c3-`  
**Council review:** mandatory (contracts + kernel risk tiers)  
**Phase flags:** `ZEREF_PHASE11_AGENT=1 ZEREF_MEMORY_MOCK=1`

## Goal

Give Jarvis a **memory vault**: things the user explicitly confirmed, rejected, corrected or pinned. The vault is the curated layer the future version-pack gate (C7) and vector recall (C4) build on. The user can **forget** any vault item (hard delete, confirm-gated).

## Design (decided by council — do not change)

- **No new table.** Vault items are rows in `memory_entries` with `source = 'vault'` and `metadata_json.kind ∈ {confirmed_turn, rejection, correction, pin}`. Optional `metadata_json.sourceTurnId`.
- `MemorySourceSchema` (`packages/contracts/src/phase7/memory.ts`) today is `voice | worker | kernel | manual | system` — **add `'vault'`** or every vault save fails Zod. The DB column is free `text`, so no migration.
- `listVaultItems`: SQL filter `source = 'vault'`, then filter `metadata.kind` in JS (or ``sql`metadata_json->>'kind'` ``). Do not add a typed column.
- **Forget = hard delete** of the entry. `memory_observations.entry_id` is `ON DELETE CASCADE` (observations go automatically); `superseded_entry_id` is `ON DELETE SET NULL`. Do it in one transaction.
- Only `source = 'vault'` rows can be forgotten through the vault API.
- Risk tiers: `vault_list` = `read`, `vault_pin` = `write-low`, `vault_forget` = `write-high` (confirm). Fix `memory_save` from `read` → `write-low` (it writes). Only `write-high` requires confirm (`packages/jarvis-kernel/src/core/permissions.ts`), so eval j5 (`memory_save` completes) is unaffected. If the executor registry splits handlers by tier, move `memory_save` to the write adapters.

## Allowed paths

- `packages/contracts/src/phase7/memory.ts` — add `'vault'` to `MemorySourceSchema`
- `packages/contracts/src/phase7/memory-vault.ts` (create) — `VaultKindSchema = z.enum(['confirmed_turn','rejection','correction','pin'])`, `VaultItemSchema { id, kind, content, entityId?: uuid|null, sourceTurnId?: string|null, createdAt }`; export via `phase7/index.ts` and the **phase7 block only** of `packages/contracts/src/index.ts` (C6 appends a phase14 block in parallel — do not touch other blocks)
- `packages/contracts/test/memory-vault.test.mjs` (create)
- `packages/zeref-memory/src/vault.ts` (create) — `toVaultSaveInput(kind, content, opts)`, `isVaultEntry(entry)`, `toVaultItem(entry)`
- `packages/zeref-memory/src/types.ts` — add to `MemoryAdapter`: `saveVaultItem`, `listVaultItems({ kind?, limit? })`, `forgetVaultItem(id)` → `{ deleted: boolean }`
- `packages/zeref-memory/src/mock-adapter.ts`, `postgres-adapter.ts`, `memory-service.ts`, `index.ts` — implement + export (C3 is the only owner of `index.ts` this week)
- `packages/zeref-memory/test/vault.test.mjs` (create); `test/vault-postgres.test.mjs` (create, skips without `DATABASE_URL`)
- `packages/jarvis-kernel/src/zeref/tool-descriptors.ts`, `tool-executor.ts`, `adapters/read-adapters.ts`, `adapters/write-adapters.ts`, `core/ports/memory-port.ts` — three vault tools + `memory_save` tier fix
- `packages/jarvis-kernel/test/vault-tools.test.mjs` (create)
- `apps/web/lib/jarvis/memory-port.ts` — wire vault methods
- `apps/web/lib/jarvis/llm-port.ts` — mock routing only: `/\bpin\b/` → `vault_pin`, `/\bforget\b/` → `vault_forget`, `/(pinned|vault)/` → `vault_list` (C3 is the only owner of this file this week)
- `docs/cloud/log/CLOUD-C3.md` (create)

## Forbidden

- `packages/db/**` (no migration, no schema change)
- A second memory table / store
- Deleting non-vault memory entries through vault tools
- `eval/jarvis/golden-tasks.jsonl` (propose new cases in the log file for human sign-off instead)
- UI (vault panel is Horizon 2, C8)

## Tests (write first)

1. `vault.test.mjs` (mock adapter): save each kind → list returns it with correct kind; list filters by kind; forget returns `{deleted:true}` and item disappears from list **and** from `searchMemory`; forget of a non-vault entry returns `{deleted:false}` and leaves it intact.
2. `vault-postgres.test.mjs`: same flow on Postgres, including observations removed; `test.skip` when `!process.env.DATABASE_URL`.
3. `vault-tools.test.mjs`: descriptor tiers exactly `read / write-low / write-high`; `memory_save` is `write-low`; `vault_forget` returns `awaiting_confirm` without `confirmed`, executes with it.

## Verify

```bash
export ZEREF_BFF_FIXTURE=1 ZEREF_LLM_MOCK=1 ZEREF_MEMORY_MOCK=1 ZEREF_JOB_ENQUEUE_MOCK=1 ZEREF_PHASE11_AGENT=1
npm run build && npm run lint
npm test -w @zeref/contracts -w @zeref/zeref-memory -w @zeref/jarvis-kernel -w @zeref/web
node eval/jarvis/run-eval.mjs   # must stay ≥80 % task, ≥80 % tool, 0 unsafe
```

## Acceptance

- [ ] Vault CRUD works in mock and Postgres (CI) adapters
- [ ] Forget is confirm-gated and removes observations
- [ ] Mock-mode kernel test: "pin this: post reels at 7pm" → `vault_pin`; "what have you pinned" → `vault_list` result contains "post reels at 7pm" (the spoken answer text is D2's job)
- [ ] Eval unchanged: ≥ 80 % task, ≥ 80 % tool, 0 unsafe
- [ ] CI green

## Laptop follow-up

- Planner: voice "pin this: post reels at 7pm" → "what have you pinned" → "forget that" (confirm) on the live stack.
