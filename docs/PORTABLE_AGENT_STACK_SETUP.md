# Portable Agent Stack — Zeref installation

**Source:** StudyPilot v2 orchestration stack (Waves 0–3, May 2026)  
**Installed in Zeref:** 2026-05-30  
**Use:** Onboarding for Lead orchestrator + worker agents.

---

## Zeref status (this repo)

| Layer | Status |
|-------|--------|
| GSD Redux | Installed — `.cursor/skills/gsd-*`, `.cursor/get-shit-done/` |
| Superpowers | **User action:** `/add-plugin superpowers` in Cursor Agent chat, then restart |
| UI UX Pro Max | Installed — `.cursor/skills/ui-ux-pro-max/` (also under `apps/web/.cursor/`) |
| Council skills | Installed — `.cursor/skills/council-*`, `run-verify-gate` |
| Council board | `config/council/zeref-board.yaml` |
| Runtime truth | `docs/CURRENT_STATE.md` (not `.planning/STATE.md` alone) |
| Phase gates | `scripts/phase_gate.ps1` → `npm run verify:phase-N` |

**Design reference:** [design/reference/lukebuildsai-jarvis-hud.jpeg](./design/reference/lukebuildsai-jarvis-hud.jpeg) (Luke JARVIS HUD — Phase 5.1 target)

---

## 1. Architecture (5 layers)

| Layer | Purpose | Zeref example |
|-------|---------|---------------|
| **Product phases** | What to ship in order | Phase 0–5 done → **5.0.1 ops** → **5.1 Luke HUD** → **6 voice** |
| **Orchestration** | Who owns what, task cards | Karpathy 3-stage council + Lead + workers |
| **Agent quality** | TDD, review, verification | Superpowers plugin |
| **Planning / index** | Phases, codebase map | GSD Redux + `.planning/codebase/` |
| **Design (frontend)** | Jarvis HUD, not generic AI chrome | UI UX Pro Max — **Iron Man cyan mono, point-cloud globe** |

---

## 2. External repos (install order)

### P0 — Installed in Zeref

| # | Tool | Install |
|---|------|---------|
| 1 | **GSD Redux** | `npx @opengsd/get-shit-done-redux@latest --local --cursor --profile=standard` |
| 2 | **UI UX Pro Max** | `cd apps/web && uipro init --ai cursor` (+ copy to root `.cursor/skills/`) |
| 3 | **Council skills** | See `docs/COUNCIL_SKILLS_COPYPASTE.md` |

### Manual (user)

| Tool | Command |
|------|---------|
| **Superpowers** | `/add-plugin superpowers` → restart Cursor |

### Do NOT use

- `glittercowboy/get-shit-done` — use **open-gsd/get-shit-done-redux**

---

## 3. Council orchestration

See [COUNCIL_ORCHESTRATION.md](./COUNCIL_ORCHESTRATION.md) · [LEAD_ORCHESTRATOR.md](./LEAD_ORCHESTRATOR.md) · [AGENTS.md](../AGENTS.md)

---

## 4. Docs template (runtime truth)

| File | Role |
|------|------|
| `docs/CURRENT_STATE.md` | Single source of truth: done / next / metrics |
| `docs/GAP_BACKLOG.md` | Product gaps with DONE/PARTIAL/OPEN |
| `docs/TOOLING_INDEX.md` | Installed repos + commands |
| `docs/WORKER_TASK_CARDS_QUEUE.md` | Copy-paste cards per phase |
| `docs/CI_SETUP.md` | GitHub Actions + local gate |
| `docs/api-contracts.md` | BFF routes + job contracts |
| `AGENTS.md` | Path ownership matrix |
| `docs/failures-checklist.md` | Anti-patterns from legacy ios |

---

## 5. Verify gate (Zeref)

**Never** run long Playwright + full DB integration in agent shell for 30+ minutes — user terminal.

```powershell
cd c:\Projects\zeref
docker compose up -d db
$env:DATABASE_URL='postgres://zeref:zeref@localhost:5432/zeref'
$env:ZEREF_LLM_MOCK='1'
$env:ZEREF_BFF_FIXTURE='1'
.\scripts\phase_gate.ps1 -Phase 5
```

---

## 6. Rules of precedence (Zeref policy)

1. **`docs/failures-checklist.md` + `verify:phase-N`** beat GSD/Superpowers defaults
2. **GSD** owns `.planning/` phase artifacts; **`docs/CURRENT_STATE.md`** is runtime truth for agents
3. **UI UX Pro Max:** Jarvis HUD aesthetic (cyan mono, glass panels, honest data) — NOT generic purple AI gradients
4. **Council Stage 2** before merging worker jobs, schema, contracts, BFF routes
5. **Multi-agent HARD RULE:** Lead outputs copy-paste worker prompts and **STOPS** — one agent per path scope
6. **Never** fake telemetry or silent empty cockpit on BFF errors

---

## 7. Bootstrap checklist (Zeref)

```markdown
## Wave 0 — Tooling
- [x] GSD Redux installed
- [ ] Superpowers: `/add-plugin superpowers` → restart Cursor
- [x] uipro init in apps/web + root copy
- [x] Council skills + board + rules
- [x] docs/CURRENT_STATE.md, GAP_BACKLOG.md, AGENTS.md, failures-checklist.md
- [x] .cursor/rules/lead-orchestrator.mdc + council-governance.mdc

## Wave 0b — Index
- [x] .planning/codebase/ (7 files)

## Wave 1+ — Product
- [ ] Phase 5.0.1 ops (worker daemon, dev:stack, run-pipeline)
- [ ] Phase 5.1 Luke HUD visual contract + implement
- [ ] Council Stage 2 before worker/schema/BFF merges
```

---

## 8. One-line pitch (README)

```text
Orchestration: Karpathy 3-stage council + GSD phases + Superpowers TDD +
UI UX Pro Max for Jarvis HUD. Lead writes task cards; workers own paths;
CURRENT_STATE.md is truth; verify:phase-N blocks regressions.
```

---

*Adapted from StudyPilot v2 — see original patterns in StudyPilot `docs/PORTABLE_AGENT_STACK_SETUP.md`.*
