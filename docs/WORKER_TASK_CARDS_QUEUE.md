# Worker task cards queue — Zeref

Lead copies cards into **new** worker chats. Update status after each slice.

---

## READY — Phase 5.1 (after Planner approves contract)

### Card P5.1-A — Agent UI (Luke HUD + globe)

**Gate 1:** Planner approves `phase-5.1-contract.md` + ADR-015 amendment.

**Allowed:** `apps/web/components/**`, `apps/web/app/cockpit/**`, `apps/web/app/globals.css`, `apps/web/e2e/**`  
**Forbidden:** `apps/web/app/api/**`, `apps/worker/**`, `packages/contracts/**` (unless Planner assigns Contracts to UI)

**Acceptance:** `npm run verify:phase-5.1` (when exists) or scoped Playwright; screenshot vs reference JPEG.

---

### Card P5.1-B — Agent BFF/Events (SSE stub shell)

**Allowed:** `apps/web/app/api/v1/events/**`, `packages/contracts/src/**` (TelemetryEventSchema only), `apps/web/lib/**` (events helpers)  
**Forbidden:** `apps/worker/**`, globe components

**Acceptance:** SSE route returns stream; events include `simulated: true`; contract tests if schema added.

---

### Card P5.1-C — Agent Docs/QA (verify:phase-5.1 + CI)

**Allowed:** `scripts/verify-phase-5.1.mjs`, `.github/workflows/ci.yml`, `docs/governance/**`, `docs/CURRENT_STATE.md`, `package.json` (verify script only)  
**Forbidden:** `apps/web/components/**` (UI agent)

**Acceptance:** `verify:phase-0` … `verify:phase-5.1` green; CI Phase 0–5.1 gate.

---

## COMPLETED — Phase 5.0.x / Phase 5

See `docs/CURRENT_STATE.md` and git log @ `568a5fc`.

---

## Template (blank)

See [COUNCIL_ORCHESTRATION.md](./COUNCIL_ORCHESTRATION.md).
