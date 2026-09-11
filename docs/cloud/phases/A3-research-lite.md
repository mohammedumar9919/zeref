# CLOUD-A3 — Research intel lite

**Queue ID:** CLOUD-A3  
**Depends on:** A2 research cards helpful  
**Remote:** Mostly yes (Graph competitor wave optional / may need tokens)

## Goal

Own-account **outlier vs median** (e.g. 5×) from `metric_facts`, caption hook score 0–10 via LLM (mockable), one grounded weekly brief. Optional Wave 2: Graph professional competitor handles only — **no scrape**.

## Allowed paths

- `packages/analytics/**` (outlier helpers)
- `packages/contracts/**` (new signal types if needed)
- `apps/worker/src/jobs/research.ts` (+ tests)
- `apps/web` research UI + JARVIS tool descriptors / eval golden tasks
- `eval/jarvis/**` (add tasks; human-approved later)

## Forbidden

- Personal-account scraping
- Video CV / frame analysis
- Unsafe write tools without confirm + eval

## Acceptance

- [ ] Fixture path shows outliers + readable brief
- [ ] JARVIS tools registered + eval tasks added
- [ ] PR + AGENT_LOG
- [ ] Live Graph competitor = optional follow-up PR
