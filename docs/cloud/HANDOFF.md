# Handoff protocol — Cloud → Laptop Planner

So the laptop Planner (and you later) can **read and continue** remote work without guessing.

---

## Branch + PR rules

| Rule | Example |
|------|---------|
| Branch | `cloud/p62-workspace-hud` |
| PR title | `cloud(p62): workspace routes + unified HUD header` |
| PR body must include | Queue ID, phase card path, files touched, how to test with fixtures, screenshot TODO for laptop |
| Labels (if available) | `cloud`, `track-b` (Track A labels obsolete for new work) |
| Base | `main` |
| Never | force-push `main`, commit `.env`, merge your own PR without Planner note unless emergency |

### Required PR template (paste)

```markdown
## Queue
- ID: CLOUD-P62
- Card: docs/cloud/phases/P62-visual-tier3.md

## Summary
- …

## Files
- …

## Test (fixture)
- Secrets: ZEREF_BFF_FIXTURE=1 (+ mocks)
- Commands run: …

## Laptop follow-up
- [ ] Visual UAT / screenshot vs Luke ref
- [ ] Merge + CURRENT_STATE update by Planner

## AGENT_LOG
- Entry appended: yes
```

---

## AGENT_LOG (mandatory)

On every remote session, **append** (do not rewrite history) to [AGENT_LOG.md](./AGENT_LOG.md):

```markdown
### YYYY-MM-DD — CLOUD-P62 — agent:<name-or-grok>
- Branch: cloud/p62-…
- Status: started | pr_ready | blocked
- PR: <url or n/a>
- Done: …
- Not done / blocked: …
- Next for Planner: …
```

---

## How the laptop Planner reviews your work

1. `git fetch` + open your PR
2. Read AGENT_LOG + PR body
3. Diff against phase card acceptance
4. Run local visual/voice UAT if needed
5. Merge → update [../CURRENT_STATE.md](../CURRENT_STATE.md) + QUEUE status `DONE`

If you are blocked, write `blocked` in AGENT_LOG with the exact error — do not silently switch phases.

---

## What Grok Bot should tell the user on the phone

After opening a PR:

> PR ready: \<url\>. Queue ID CLOUD-…. Laptop Planner should review AGENT_LOG + merge. I will not start the next queue item until QUEUE says so.
