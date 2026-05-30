# Agent stack — pending commit (plan mode blocklist)

**Created:** 2026-05-30

Plan mode allowed markdown docs but blocked these non-markdown paths. **Switch to Agent mode** and commit in one pass, or paste manually.

---

## Checklist

- [x] `config/council/zeref-board.yaml`
- [x] `.cursor/rules/lead-orchestrator.mdc`
- [x] `.cursor/rules/council-governance.mdc`
- [x] `.cursor/rules/orchestrator.mdc`
- [x] `AGENTS.md` at repo root
- [x] `scripts/phase_gate.ps1`
- [x] `scripts/phase_gate.sh`
- [ ] User: `/add-plugin superpowers` + Cursor restart
- [ ] Git commit: all docs + `.cursor/` + reference JPEG

---

## Already installed (on disk)

- GSD Redux → `.cursor/get-shit-done/`, `.cursor/skills/gsd-*`
- UI UX Pro Max → `.cursor/skills/ui-ux-pro-max/`
- Council skills → `.cursor/skills/council-*`, `run-verify-gate`

---

## One-shot agent mode prompt

```text
Complete Zeref agent stack commit pass:
1. Write all files listed in docs/AGENT_STACK_PENDING_COMMIT.md
2. Copy docs/AGENTS.md to root AGENTS.md
3. Do not change application code
4. Report git status
```
