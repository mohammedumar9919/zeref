# Zeref — ROADMAP

**Updated:** 2026-05-30

---

## Completed

| Phase | Goal | Verify |
|-------|------|--------|
| 0 | Monorepo scaffold, CI, design stub | `verify:phase-0` |
| 1 | Contracts + snapshot DB | `verify:phase-1` |
| 2 | Instagram collect → snapshots | `verify:phase-2` |
| 3 | normalize + embed | `verify:phase-3` |
| 4 | analyze + report | `verify:phase-4` |
| 5 | Cockpit shell + BFF + Playwright | `verify:phase-5` |

---

## Next (ordered)

| Phase | Goal | Blocker |
|-------|------|---------|
| **Stack** | Portable agent stack committed | Partial — finish rules/yaml/scripts |
| **5.0.1** | Worker daemon, dev:stack, run-pipeline, BFF errors | Planner contract |
| **5.1** | Luke JARVIS HUD, ADR-015 amend, telemetry shell | 5.0.1 recommended |
| **6** | Whisper + jarvis-kernel + voice UI | 5.1 sign-off |
| **7** | zeref-memory + event→orb | 6 |

---

## Agent stack milestones

- [x] GSD Redux install
- [x] UI UX Pro Max install
- [x] Council skills (4)
- [x] Council board YAML + `.cursor/rules/*.mdc`
- [x] `scripts/phase_gate.ps1` / `phase_gate.sh`
- [x] Runtime docs (CURRENT_STATE, GAP_BACKLOG, etc.)
- [ ] Superpowers plugin (user: `/add-plugin superpowers`)
- [ ] Git commit entire stack to remote

---

## Gap IDs

See [docs/GAP_BACKLOG.md](../docs/GAP_BACKLOG.md)
