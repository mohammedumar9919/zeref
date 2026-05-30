# Zeref — Agent tooling index

**Updated:** 2026-05-30  
**Full bootstrap guide:** [PORTABLE_AGENT_STACK_SETUP.md](./PORTABLE_AGENT_STACK_SETUP.md)

---

## Installed (Wave 0)

| Tool | Repo | Location | Status |
|------|------|----------|--------|
| **GSD Redux** | [open-gsd/get-shit-done-redux](https://github.com/open-gsd/get-shit-done-redux) | `.cursor/skills/gsd-*`, `.cursor/get-shit-done/` | **DONE** v1.1.0 |
| **UI UX Pro Max** | [nextlevelbuilder/ui-ux-pro-max-skill](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill) | `.cursor/skills/ui-ux-pro-max/` | **DONE** |
| **Council skills** | Zeref-native | `.cursor/skills/council-*`, `run-verify-gate` | **DONE** |
| **Council board** | Zeref-native | `config/council/zeref-board.yaml` | **DONE** |
| **Cursor rules** | Zeref-native | `.cursor/rules/*.mdc` | **DONE** |
| **Phase gate** | Zeref-native | `scripts/phase_gate.ps1` | **DONE** |

### GSD next step

After Cursor restart, run skill **gsd-map-codebase** to refresh `.planning/codebase/` (initial index committed 2026-05-30).

```bash
node .cursor/get-shit-done/bin/gsd-tools.cjs init map-codebase
```

---

## Installed (user)

| Tool | Repo | Status |
|------|------|--------|
| **Superpowers** | [obra/superpowers](https://github.com/obra/superpowers) | **DONE** — invoke `using-superpowers` at session start |

### Superpowers skills to invoke

| Skill | When |
|-------|------|
| `using-superpowers` | Start of session |
| `writing-plans` | Multi-step work before code |
| `test-driven-development` | Features and bugfixes |
| `systematic-debugging` | Failures |
| `verification-before-completion` | Before claiming done |
| `subagent-driven-development` | Parallel independent tasks |

---

## Reference only

| Tool | Repo | Use |
|------|------|-----|
| **Karpathy LLM Council** | [karpathy/llm-council](https://github.com/karpathy/llm-council) | Process — [COUNCIL_ORCHESTRATION.md](./COUNCIL_ORCHESTRATION.md) |
| **jarvis-orb** | [TheStack-ai/jarvis-orb](https://github.com/TheStack-ai/jarvis-orb) | Luke HUD + event→orb reference |
| **Claude Mem** | [thedotmack/claude-mem](https://github.com/thedotmack/claude-mem) | Defer — use `CURRENT_STATE.md` |

---

## Do not use

- `glittercowboy/get-shit-done` — superseded by **open-gsd/get-shit-done-redux**

---

## Zeref rules of precedence

1. `docs/failures-checklist.md` + `verify:phase-N` beat GSD/Superpowers defaults
2. GSD owns `.planning/` phase artifacts; **`docs/CURRENT_STATE.md`** is runtime truth
3. UI UX Pro Max: **Jarvis HUD** (cyan mono, glass, honest metrics) — not generic AI purple
4. Council Stage 2 before worker/schema/BFF/contract merges
5. Lead outputs worker prompts and **STOPS** — no single-pass multi-agent (Phase 4 regression)

---

## Verify commands

See [CI_SETUP.md](./CI_SETUP.md) and [governance/verify.md](./governance/verify.md).

```powershell
.\scripts\phase_gate.ps1 -Phase 5
```

---

## Worker task cards

Queue: [WORKER_TASK_CARDS_QUEUE.md](./WORKER_TASK_CARDS_QUEUE.md)
