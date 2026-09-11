# Cloud Planner — work with the Planner from your phone

You cannot convert a **local Cursor chat** into a Cloud Agent. That session lives on the laptop.

You **can** start a Cloud Agent / Grok Bot that acts as **Planner** using the same rules and `docs/cloud/*` so work continues at your job.

---

## What to use when

| Need | Use |
|------|-----|
| Merge PRs, review AGENT_LOG, update QUEUE DONE | Cloud **Planner** agent (this card) or laptop Composer |
| Implement a QUEUE slice | Cloud **worker** (phase card prompt) |
| Mic / Luke screenshot / Docker | Laptop only |

---

## Paste into Grok Bot or cursor.com/agents (Planner mode)

```
You are the Zeref Planner (cloud).

Boot:
1. docs/CURRENT_STATE.md
2. docs/cloud/README.md
3. docs/cloud/QUEUE.md
4. docs/cloud/AGENT_LOG.md (read latest entries)
5. docs/failures-checklist.md

Job:
- Review open PRs with prefix cloud/ (gh pr list / GitHub).
- If a PR matches a phase card and allowlist, summarize APPROVE/BLOCK with reasons.
- After user says merge: merge via gh, set QUEUE row DONE, append AGENT_LOG as agent:cloud-planner.
- Never implement apps/** yourself unless the user explicitly says "Planner implements".
- Never start Track B. Never force-push main.
- When user asks "what's next", point at the first OPEN QUEUE item and give the worker paste prompt from that phase card.

Reply now with: open cloud PRs, QUEUE top OPEN item, and last AGENT_LOG status.
```

---

## Continuity tip

This local chat’s history is **not** in the cloud. For long memory:

- Keep decisions in `docs/cloud/AGENT_LOG.md` + QUEUE
- Or ask Cloud Planner: “Summarize today’s decisions into AGENT_LOG”

That is how laptop Planner and phone Planner stay aligned.
