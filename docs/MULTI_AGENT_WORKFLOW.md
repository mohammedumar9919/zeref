# Multi-agent workflow — Zeref

**Multitask Mode:** OFF by default (user opens separate Composer chats).

---

## Roles

| Chat | Role |
|------|------|
| **Planner** | Master plan, phase contracts, sign-off, fault analysis |
| **Lead orchestrator** | Task cards, council review, merge coordination |
| **Worker agents** | One scope per chat (UI, Worker, BFF, Contracts, QA) |
| **Human** | Gate 1: approve contract. Gate 2: approve merge after verify |

---

## HARD RULE (Phases 5.1+)

After Discuss + Contract approval, Lead MUST:

1. Write one task card per agent
2. Output **copy-paste prompts** for each new worker chat
3. **STOP** — do not implement worker paths in Lead chat

Phase 4 violated this (single pass). Do not repeat.

---

## Worker spawn pattern

```text
User: New Composer chat
Paste: Worker task card from docs/WORKER_TASK_CARDS_QUEUE.md
Worker: Read CURRENT_STATE → implement ONLY owned paths → return summary + files + risks
Lead: Council Stage 2 → user runs verify → merge
```

Max **2–3** parallel writing workers. **One file, one owner.**

---

## Verification

User terminal (preferred):

```powershell
cd c:\Projects\zeref
.\scripts\phase_gate.ps1 -Phase 5
```

Lead collects stdout; does not claim green without log evidence.

---

## Related

- [AGENTS.md](../AGENTS.md)
- [COUNCIL_ORCHESTRATION.md](./COUNCIL_ORCHESTRATION.md)
- [orchestrator.md](./orchestrator.md)
