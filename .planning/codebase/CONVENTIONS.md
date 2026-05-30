# CONVENTIONS — Zeref

---

## Code

- **ESM** throughout (`"type": "module"`)
- **TypeScript project references** — `tsc -b tsconfig.build.json`
- **Branded IDs** in `@zeref/contracts` (ADR-002)
- **Zod parse at boundaries** — job I/O, BFF responses
- **Private packages** — `@zeref/*` workspace names

---

## Naming

| Artifact | Pattern |
|----------|---------|
| Commits (phase work) | `phaseN(scope): message` |
| Job types | lowercase: `collect`, `normalize`, … |
| ADRs | `ADR-NNN-short-title.md` |
| Phase contracts | `docs/governance/phase-N-contract.md` |
| Verify scripts | `scripts/verify-phase-N.mjs` |

---

## Worker patterns

- Handlers: `createXHandler(deps)` + `runX(data, deps)`
- Auto-chain via inline `runY()` not separate queue send (normalize→embed, analyze→report)
- Integration tests call handlers directly with test pool

---

## Web patterns

- RSC for cockpit data fetch
- Client island for `GlobeCanvas` only (Q1 Phase 5)
- BFF Route Handlers return `NextResponse.json` + Zod-validated payloads
- Playwright in `apps/web/tests/e2e/`

---

## Agent / docs

- **Runtime truth:** `docs/CURRENT_STATE.md`
- **Do-not-repeat:** `docs/failures-checklist.md`
- **Ownership:** `docs/AGENTS.md` (root `AGENTS.md` when committed)
- **One file, one owner** for parallel agents

---

## UI (Phase 5.1+)

- Invoke `ui-ux-pro-max` skill before HUD work
- Jarvis aesthetic: cyan mono, glass panels, dark background — not generic AI purple
- Reference: `docs/design/reference/lukebuildsai-jarvis-hud.jpeg`
