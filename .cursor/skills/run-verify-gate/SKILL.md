---
name: run-verify-gate
description: User-terminal verify discipline for Zeref. Run phase gates in user PowerShell, not long agent shell jobs.
---

# Run verify gate (Zeref)

## Commands (user PowerShell, repo root)

```powershell
cd c:\Projects\zeref
docker compose up -d db

$env:DATABASE_URL = 'postgres://zeref:zeref@localhost:5432/zeref'
$env:ZEREF_LLM_MOCK = '1'
$env:ZEREF_BFF_FIXTURE = '1'

# Full gate through current phase
.\scripts\phase_gate.ps1 -Phase 5

# Or individual phases
npm run verify:phase-0
npm run verify:phase-1
# ... through verify:phase-5
```

## Smoke (fast)

```powershell
npm run build
npm run lint
npm run verify:phase-0
npm run verify:phase-5   # uses fixture BFF; no live DB for Playwright path
```

## Never

- Skip verify because "it looks fine"
- Run 30+ minute Playwright/debug loops in agent shell — user runs these
- Set `ZEREF_LIVE_INSTAGRAM` or live API keys in CI without explicit phase contract

## After gate

Read output; update `docs/CURRENT_STATE.md`; Planner sign-off for phase completion.
