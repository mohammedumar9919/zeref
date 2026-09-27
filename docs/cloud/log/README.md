# Per-phase worker logs (Track C)

One file per queue ID: `docs/cloud/log/CLOUD-C1.md`. Workers write **only their own file** so parallel PRs never conflict. The Planner copies a one-line summary into [../AGENT_LOG.md](../AGENT_LOG.md) on merge.

## Template

```markdown
# CLOUD-C1 — <title>

- Agent: grok-<chat number>
- Branch: cloud/c1-<slug>
- PR: <url>
- Status: started | pr_ready | blocked

## Done
- …

## Tests
- Commands run + result (pass counts)

## Not done / blocked
- … (exact error text if blocked)

## Laptop follow-up
- …
```
