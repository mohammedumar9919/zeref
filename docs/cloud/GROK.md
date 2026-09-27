# Grok Bot — Track C operating instructions

**Read this every session.** It overrides older "take the first OPEN row" wording anywhere else.

---

## 1. Boot (in order)

1. [../CURRENT_STATE.md](../CURRENT_STATE.md)
2. [MASTERPLAN.md](./MASTERPLAN.md) — sections "Track C — week 1" and "Jarvis self-improvement rules"
3. [QUEUE.md](./QUEUE.md) — confirm your assigned ID is `OPEN`
4. **Your phase card only** — `docs/cloud/phases/<ID>-*.md`
5. [../failures-checklist.md](../failures-checklist.md)
6. [HANDOFF.md](./HANDOFF.md) — PR template

## 2. Claim rules

- The user gives each chat **one assigned ID** (e.g. `CLOUD-C1`). Work only on that ID.
- Before coding: `gh pr list --state open --search "head:cloud/c1-"` (use your ID). If a PR already exists, stop and tell the user.
- The row must be `OPEN` in QUEUE on `main`. If it is `NEXT`, a dependency has not merged — stop and tell the user which one.
- Branch from **latest `main`**: `git fetch origin && git checkout -b cloud/<id>-<slug> origin/main`.
- Open a **draft PR after your first commit** so other chats can see the claim.

## 3. While working

- Edit **allowed paths only** (card). Forbidden path needed? Stop, write it in your log, tell the user.
- TDD: write the card's tests first, see them fail, then implement.
- Fixture env (Cloud Secrets already set): `ZEREF_BFF_FIXTURE=1 ZEREF_LLM_MOCK=1 ZEREF_MEMORY_MOCK=1 ZEREF_JOB_ENQUEUE_MOCK=1 ZEREF_TTS_MOCK=1 ZEREF_WHISPER_MOCK=1` (+ phase flags listed in the card).
- No Postgres or Docker in the cloud VM. DB integration tests must **skip** when `DATABASE_URL` is unset; CI runs them.
- Never commit `.env`, tokens, or live account data. Never force-push. Never merge your own PR.

## 4. Finish

1. Run the card's **Verify** block. All green.
2. Write `docs/cloud/log/<ID>.md` (template in [log/README.md](./log/README.md)). **Do not edit `QUEUE.md`, `AGENT_LOG.md`, or `CURRENT_STATE.md`** — the Planner does that on merge.
3. Mark the PR ready for review; body = HANDOFF template.
4. Wait for CI: `gh pr checks <number> --watch`. If red, fix within allowed paths. If red for a reason outside your card, log it and stop.
5. Reply to the user: `PR ready: <url> · <ID> · CI <green|red: reason>`. **Stop.** Do not start another ID.

## 5. Week 1 assignments (copy the chat prompt from §6)

| Wave | Chat 1 | Chat 2 | Chat 3 | Starts when |
|------|--------|--------|--------|-------------|
| 0 | CLOUD-C0 | — | — | now (PR #18 merged) |
| 1 | CLOUD-C1 | CLOUD-C3 | CLOUD-C6 | C0 merged |
| 2 | CLOUD-C2 | CLOUD-C5 | — | C1 + C3 merged (C2) · C3 merged (C5) |
| Week 2 | CLOUD-C4 | CLOUD-C7 | — | C5 merged (C4) · C3 merged (C7) |

## 6. Chat prompt (replace `<ID>`)

```
You are a Zeref Track C worker for repo mohammedumar9919/zeref. Your assigned ID is <ID>. Do not work on any other ID.

Boot: read docs/cloud/GROK.md and follow it exactly (boot order, claim rules, finish steps). Then read your phase card — the file linked from your ID's row in docs/cloud/QUEUE.md (e.g. docs/cloud/phases/C1-typed-composer.md).

Work from the repo root. Fixture env: ZEREF_BFF_FIXTURE=1 ZEREF_LLM_MOCK=1 ZEREF_MEMORY_MOCK=1 ZEREF_JOB_ENQUEUE_MOCK=1 ZEREF_TTS_MOCK=1 ZEREF_WHISPER_MOCK=1 plus the Phase flags in your card. Before any Playwright run: npm -w @zeref/web run test:e2e:install. New e2e specs must test.skip when their phase flag is unset.

Rules: branch cloud/<id>-<slug> from latest origin/main; allowed paths only; TDD; fixture env; open a draft PR after the first commit; write docs/cloud/log/<ID>.md; never edit QUEUE.md, AGENT_LOG.md or CURRENT_STATE.md; never commit secrets; never merge.

When done: all Verify commands green, PR ready with the HANDOFF template, CI green via `gh pr checks --watch`. Reply "PR ready: <url> · <ID> · CI <status>" and stop. If blocked, write the exact error in docs/cloud/log/<ID>.md, push, reply "BLOCKED: <one line>" and stop.
```

## 7. What the Planner (laptop) does

- Merges in wave order, sets QUEUE `DONE`, flips dependents `NEXT → OPEN`, appends AGENT_LOG, updates CURRENT_STATE.
- Runs laptop-only checks listed in each card ("Laptop follow-up").
