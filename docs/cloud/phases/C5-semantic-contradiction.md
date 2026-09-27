# CLOUD-C5 — Semantic contradiction v1 (suspected, never auto-overwrite)

**Queue ID:** CLOUD-C5  
**Status:** see [../QUEUE.md](../QUEUE.md)  
**Remote:** Yes  
**Depends on:** CLOUD-C3 merged  
**Branch prefix:** `cloud/c5-`  
**Gap:** ZR-032 (semantic contradiction deferred)

## Goal

Today contradiction is exact-match only (`ruleBasedContradictionCheck` in `packages/zeref-memory/src/contradiction.ts`: same `entityId` + `valueKey`, different `value` → old entry marked `contradicted`). Add a **deterministic semantic layer** that catches near-misses and **flags them as suspected** for the user to resolve. It must never auto-mark `contradicted`.

## Heuristics (deterministic, no LLM, no embeddings)

1. **Key aliases** — normalize `valueKey` (lowercase, strip `_ - space`, alias map e.g. `besttimetopost ↔ postingtime`, `niche ↔ topic`).
2. **Negation flip** — same normalized content except a negation token (`not`, `never`, `don't`, `no longer`).
3. **Numeric change** — same key, both values numeric (with the same unit like `pm`, `%`, `k`), different number.

Output: `SuspectedContradiction { entryId, suspectedOfId, reason: 'alias'|'negation'|'numeric', confidence: 0..1 }`.

## Storage

On save, suspected matches are written to the **new entry's** `metadata_json.suspectedContradictionOf: [{ id, reason }]`. The old entry is untouched. Exact-rule behavior stays as is.

## Allowed paths

- `packages/zeref-memory/src/semantic-contradiction.ts` (create) — `semanticContradictionCheck(candidate, existing)`, `normalizeValueKey`
- `packages/zeref-memory/src/contradiction.ts` — export a combined `checkContradictions()` returning `{ exact, suspected }`
- `packages/zeref-memory/src/mock-adapter.ts`, `postgres-adapter.ts` — save path only: call combined check, store suspected in metadata
- `packages/zeref-memory/test/semantic-contradiction.test.mjs` (create)
- `docs/cloud/log/CLOUD-C5.md` (create)

## Forbidden

- `packages/zeref-memory/src/index.ts` changes beyond re-exporting `checkContradictions`, `semanticContradictionCheck` and their types (keep `ruleBasedContradictionCheck`)
- Marking anything `contradicted` from a suspected match
- LLM calls, embeddings, `packages/db/**`, contracts changes
- `docs/GAP_BACKLOG.md` (Planner updates ZR-032)

## Tests (write first)

- alias: `best_time_to_post="7pm"` vs existing `posting_time="9pm"` → suspected `alias`
- negation: "user likes reels" vs "user does not like reels" (same entity) → suspected `negation`
- numeric: `target_er="4%"` vs `"6%"` → suspected `numeric`; `"4%"` vs `"4 %"` → none
- different entity → none; exact rule case still marks old `contradicted` (regression)
- save path (mock adapter): suspected ids land in new entry metadata; old entry `observation` unchanged

## Verify

```bash
npm run lint
npm test -w @zeref/zeref-memory -w @zeref/web
```

## Acceptance

- [ ] Three heuristics covered; zero auto-overwrite
- [ ] Existing contradiction tests green; CI green
