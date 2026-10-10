# CLOUD-C7 — Jarvis version packs + human-only promotion gate

- Agent: cursor worker (laptop worktree)
- Branch: cloud/c7-version-packs
- PR: not opened (worker card: push only)
- Status: PR_READY — council review mandatory (self-improvement safety)

## Done

- **Config (`config/jarvis/`):**
  - `packs/v1.json`: the seed pack. It has 22 tools, and their tiers mirror `tool-descriptors.ts` exactly. A test checks this by parsing the TS source. `promptRules` copies the static `persona.ts` rules. `vaultSnapshotId: null` is a placeholder until pinning lands.
  - `active.json` is `{ "pack": "v1", "previous": null }`.
  - `candidates/` holds only a `.gitkeep`.
  - `promotions.jsonl` is created on the first approve or rollback, and is only ever appended to.
- **`scripts/lib/jarvis-pack.mjs`:** pure helpers (`validatePackShape`, `compareToActive`, `parseEvalOutput`, `evaluateGate`, `checkCliGuard`, `rollback`, `loadDescriptorTiers`, `runPromote`). Every side effect can be injected.
- **`scripts/jarvis-promote.mjs`:** a thin CLI wrapper.
  - Guard:
    - `CI` set → refuse, except a pure `--dry-run`.
    - stdin is not a TTY → refuse, except `--dry-run`.
    - No `--approve` → refuse.
    - `--approve` combined with `--dry-run` → refuse.
    - `--rollback` also needs a TTY and no CI.
  - Tier check: the candidate is compared against the active pack and against the live descriptor tiers (an extra floor). It is refused if any tool's tier is lowered, if any tool is removed (write-high tools get their own explicit message), or if a tier is unknown. The tier check runs before the eval.
  - Gate: runs `eval/jarvis/run-eval.mjs` unchanged, as `node --import tsx` with cwd `apps/web` and the mock/fixture env. The output is parsed with the card's regexes. It needs exit 0, task ≥ 0.8, tool ≥ 0.8, and unsafe === 0. A missing metric fails closed.
  - On pass:
    - The candidate is copied to `packs/` with `wx`. An existing pack with different content is refused, because packs are immutable.
    - `active.json` is set to `{ pack: candidate, previous: oldActive }`. Re-approving the pack that is already active keeps `previous` unchanged.
    - A record `{ ts, from, to, eval, approvedBy }` is appended to `promotions.jsonl`.
  - Rollback swaps active ↔ previous and appends `{ action: "rollback", eval: null, … }`.
- **Kernel (`core/audit.ts` only):**
  - `JarvisAuditEntry.packVersion?` is a new optional, readonly field.
  - `createAuditBuffer({ packVersion? })` stamps each entry. The value comes from `ZEREF_JARVIS_PACK`, else `config/jarvis/active.json` found by walking up from cwd, else `"unversioned"`. The lookup never throws.
  - It is a label only. Pack tiers are **not** loaded into the executor.

## Deviations (for council)

1. `persona.ts` is not touched. The stamp lives in `audit.ts`, which avoids adding `fs` to the persona module.
2. `resolveActivePackVersion` is not re-exported from the kernel barrel, because `core/index.ts` is outside the card. Tests import `dist/core/audit.js` directly.
3. `packVersion` is not persisted. `apps/web/lib/jarvis/audit-persist.ts` maps fields explicitly, and both `apps/**` and `packages/db/**` are forbidden. Follow-up: add the DB column and the contract field.
4. `--dry-run` is allowed while `CI` is set, because the card says Grok may run it and it writes nothing. Every write path refuses CI.
5. Candidate lookup falls back to `packs/<name>.json`, so `--candidate v1` works for the human sign-off in the laptop follow-up.

## Tests

- `npx tsc -b tsconfig.build.json` / `npm run lint`: clean.
- `node --test scripts/test/jarvis-pack.test.mjs`: 39/39. Covers validate, the gate (including the card's two examples), the CLI guard (spawned with `CI=1` and with non-TTY), dry-run writing nothing, approve, append-only history, rollback, path traversal, the seed matching the descriptors, and the kernel stamp. All of these use temp dirs.
- `npm test -w @zeref/jarvis-kernel`: 60/60.
- `node scripts/jarvis-promote.mjs --candidate v1 --dry-run`: PASS (task 1, tool 1, unsafe 0). Nothing was written.
- `apps/web`: `node --import tsx ../../eval/jarvis/run-eval.mjs` gives 10/10, 100% / 100%, 0 unsafe.

## Laptop follow-up

- Human, in PowerShell: `node scripts/jarvis-promote.mjs --candidate v1 --approve`.
