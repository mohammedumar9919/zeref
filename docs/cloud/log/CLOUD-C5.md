# CLOUD-C5 — Semantic contradiction v1

- Agent: lead (local)
- Branch: cloud/c5-semantic-contradiction (based on PR #22 `cloud/c3-memory-vault`, which also edits the adapters)
- Status: PR_READY

## Done

- `semantic-contradiction.ts`: `semanticContradictionCheck(candidate, existing)` and `normalizeValueKey`. Deterministic, no LLM or embeddings. Same entity required.
  - alias: keys differ but normalize to the same key (separators stripped, alias map such as `best_time_to_post` and `posting_time`), values differ (confidence 0.6)
  - negation: same content once negations and auxiliaries are dropped and plurals stemmed, odd negation count on one side only; "no longer" counts once (0.7)
  - numeric: same key, both numeric with the same unit, different number; `4%` and `4 %` are equal (0.8)
- `checkContradictions()` returns `{ exact, suspected }`; suspects already covered by the exact rule are dropped.
- Save path (mock and Postgres adapters): suspects go to the new entry's `metadata.suspectedContradictionOf: [{ id, reason }]`. Old entries are untouched; only the exact rule marks `contradicted`, as before.
- `index.ts` re-exports `checkContradictions`, `semanticContradictionCheck` and their types; `ruleBasedContradictionCheck` kept.

## Tests

- `npm test -w @zeref/zeref-memory` — 34 pass (8 new in `semantic-contradiction.test.mjs`, existing contradiction tests unchanged)
- `npm test -w @zeref/web` — pass after rebuilding `@zeref/jarvis-kernel` (the C3 vault flow test needs the C3 kernel build)

## Deviations

- Same-key numeric changes (`4%` vs `6%`) are also caught by the exact rule, so on save they stay `contradicted` (existing behavior) and are not repeated as suspects. `semanticContradictionCheck` alone still reports them as `numeric`.
- `docs/GAP_BACKLOG.md` ZR-032 left for the Planner.
