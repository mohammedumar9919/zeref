# Skill invocation playbook — Zeref

**Mandatory for Lead, Planner, and worker agents.** Invoke skills **before acting**, not after.

**Precedence:** [failures-checklist.md](./failures-checklist.md) + `verify:phase-N` → GSD `.planning/` → Superpowers → domain skills (ui-ux-pro-max, council-*).

---

## Session start (every chat)

| Order | Skill / action |
|-------|----------------|
| 1 | Superpowers **`using-superpowers`** |
| 2 | Read **`docs/CURRENT_STATE.md`** |
| 3 | Read **`docs/failures-checklist.md`** |
| 4 | Read **`AGENTS.md`** |

---

## By task type

| Situation | Invoke first | Then |
|-----------|--------------|------|
| New phase / contract | GSD **`gsd-discuss-phase`** | **`gsd-plan-phase`**; Planner approval |
| Creative UI (5.1+ HUD) | Superpowers **`brainstorming`** | **`ui-ux-pro-max`**; GSD **`gsd-ui-phase`** if full UI phase |
| Multi-step implementation | Superpowers **`writing-plans`** | **`executing-plans`** or GSD **`gsd-execute-phase`** |
| Bug / latency / HTTP 500 | Superpowers **`systematic-debugging`** | Evidence in GAP_BACKLOG; fix only root cause |
| Feature or bugfix code | Superpowers **`test-driven-development`** | Scoped tests before implementation |
| Delegate to workers | **`council-propose-slice`** | Copy-paste prompts; **STOP**; **`subagent-driven-development`** if 2–3 parallel |
| Council merge / sign-off | **`council-review-slice`** | **`council-merge-slice`** |
| Before claiming done | Superpowers **`verification-before-completion`** | **`run-verify-gate`** / `scripts/phase_gate.ps1` |
| Major slice complete | GSD **`gsd-code-review`** or **`code-reviewer`** subagent | Update **`docs/CURRENT_STATE.md`** |
| Codebase index refresh | GSD **`gsd-map-codebase`** | `.planning/codebase/` |
| Isolated feature branch | Superpowers **`using-git-worktrees`** | Merge via **`finishing-a-development-branch`** |
| Receiving review feedback | Superpowers **`receiving-code-review`** | Verify before applying suggestions |
| Requesting review | Superpowers **`requesting-code-review`** | Before merge |

---

## Domain-specific

### Frontend (Jarvis HUD)

```
ui-ux-pro-max
```

Target: cyan mono, glass panels, honest metrics — [DESIGN_SYSTEM.md](./design/DESIGN_SYSTEM.md), [lukebuildsai-jarvis-hud.jpeg](./design/reference/lukebuildsai-jarvis-hud.jpeg). **Not** generic purple AI gradients.

### Orchestration / council

```
council-propose-slice → council-review-slice → council-merge-slice
run-verify-gate
```

See [COUNCIL_ORCHESTRATION.md](./COUNCIL_ORCHESTRATION.md).

### Dev performance issues

```
systematic-debugging
```

Then read [DEV_PERFORMANCE.md](./DEV_PERFORMANCE.md) — distinguish cold compile vs corrupted `.next`.

---

## Prompt block (copy into Lead / worker chats)

```text
Skills — invoke before acting:
1. using-superpowers
2. [pick from table above for this task]
3. verification-before-completion + run-verify-gate before claiming done

Read: docs/SKILL_INVOCATION.md, docs/CURRENT_STATE.md, docs/failures-checklist.md
```

### Phase 5.1 Lead example

```text
Skills:
- using-superpowers, brainstorming, ui-ux-pro-max
- gsd-discuss-phase, council-propose-slice (then STOP)
- verification-before-completion + run-verify-gate

Read: docs/SKILL_INVOCATION.md, docs/DEV_PERFORMANCE.md, lukebuildsai-jarvis-hud.jpeg
```

---

## Installed skill locations

| Stack | Path |
|-------|------|
| Superpowers | Cursor plugin (session skills) |
| GSD Redux | `.cursor/skills/gsd-*` |
| Council | `.cursor/skills/council-*`, `run-verify-gate` |
| UI UX Pro Max | `.cursor/skills/ui-ux-pro-max/` |

Full index: [TOOLING_INDEX.md](./TOOLING_INDEX.md)
