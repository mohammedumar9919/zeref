# Council skills — Zeref

Skills are installed under `.cursor/skills/`. This doc mirrors content for recovery if skills are lost.

**Live files:**

- `.cursor/skills/council-propose-slice/SKILL.md`
- `.cursor/skills/council-review-slice/SKILL.md`
- `.cursor/skills/council-merge-slice/SKILL.md`
- `.cursor/skills/run-verify-gate/SKILL.md`

See also [COUNCIL_ORCHESTRATION.md](./COUNCIL_ORCHESTRATION.md) and [config/council/zeref-board.yaml](../config/council/zeref-board.yaml) (commit pending).

---

## Pending files (agent mode commit)

These were blocked by plan mode — copy from sections below or re-run orchestrator commit pass:

1. `config/council/zeref-board.yaml`
2. `.cursor/rules/lead-orchestrator.mdc`
3. `.cursor/rules/council-governance.mdc`
4. `.cursor/rules/orchestrator.mdc`
5. `AGENTS.md` (root symlink or copy of `docs/AGENTS.md`)
6. `scripts/phase_gate.ps1`
7. `scripts/phase_gate.sh`

Full YAML and rule content: [PORTABLE_AGENT_STACK_SETUP.md](./PORTABLE_AGENT_STACK_SETUP.md) and StudyPilot `docs/COUNCIL_SKILLS_COPYPASTE.md`.

---

## Board YAML (`config/council/zeref-board.yaml`)

```yaml
council:
  name: Zeref Engineering Board
  agents:
    - id: lead_chairman
      role: Lead orchestrator
      expertise: [phase_gates, merges, docs, task_cards, planner_signoff]
    - id: agent_contracts
      role: Contracts and schemas
      expertise: [zod, openapi, fixtures, phase_contracts]
    - id: agent_data
      role: Database and migrations
      expertise: [drizzle, postgres, pgvector, snapshots]
    - id: agent_worker
      role: Pipeline worker
      expertise: [pg_boss, collect, normalize, embed, analyze, report]
    - id: agent_bff
      role: BFF API routes
      expertise: [next_route_handlers, cockpit_slices, reports_api]
    - id: agent_ui
      role: Cockpit web UX
      expertise: [react, rsc, threejs_globe, playwright, jarvis_hud]
    - id: agent_qa
      role: Verify and CI
      expertise: [verify_phase_scripts, github_actions, e2e]
  rules:
    council_required_for:
      - packages/contracts/**
      - packages/db/**
      - apps/worker/**
      - apps/web/app/api/**
      - docs/governance/phase-*-contract.md
      - docs/api-contracts.md
      - docs/governance/adr/**
```

---

## phase_gate.ps1 (scripts/)

```powershell
param(
  [Parameter(Mandatory = $true)]
  [ValidateRange(0, 5)]
  [int]$Phase
)

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot\..

if (-not $env:DATABASE_URL) {
  $env:DATABASE_URL = "postgres://zeref:zeref@localhost:5432/zeref"
}
if (-not $env:ZEREF_LLM_MOCK) { $env:ZEREF_LLM_MOCK = "1" }
if ($Phase -ge 5 -and -not $env:ZEREF_BFF_FIXTURE) { $env:ZEREF_BFF_FIXTURE = "1" }

npm run build
npm run lint

for ($i = 0; $i -le $Phase; $i++) {
  Write-Host "=== verify:phase-$i ===" -ForegroundColor Cyan
  npm run "verify:phase-$i"
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
}

Write-Host "Phase gate $Phase OK" -ForegroundColor Green
```
