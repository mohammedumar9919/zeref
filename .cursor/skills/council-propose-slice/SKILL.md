---
name: council-propose-slice
description: Stage 1 — Lead writes task card and spawns parallel worker proposals for a Zeref slice. Use when starting multi-agent phase work.
---

# Council Stage 1 — Propose

## When to use

Starting a non-trivial slice (worker job, BFF route, cockpit UI, schema change).

## Steps

1. Read `docs/CURRENT_STATE.md` and `docs/GAP_BACKLOG.md`.
2. Assign **one owner** per file from `AGENTS.md`.
3. Write task card with:
   - Allowed paths
   - Forbidden paths
   - Acceptance command (`npm run verify:phase-N` or scoped test)
4. User opens **new worker chat** per agent if parallel Stage 1 needed (max 2–3).
5. Collect each worker's: summary, files changed, risks for Stage 2.

## Zeref HARD RULE

Lead outputs **copy-paste prompts** for each worker chat, then **STOPS**. Lead does not implement worker-owned paths.

## Output

Task card ready for Gate 1 (user approval) before coding.
