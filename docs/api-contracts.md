# Zeref — API and job contracts

**Version:** Phase 10 (`PHASE10_CONTRACT_VERSION` in `@zeref/contracts`)  
**BFF location:** `apps/web/app/api/v1/` (ADR-016 — not `apps/api`)

Council Stage 2 required for changes to this file or underlying Zod schemas.

---

## HTTP BFF (browser-facing)

| Method | Path | Handler | Response schema |
|--------|------|---------|-----------------|
| GET | `/api/v1/cockpit/slices` | `apps/web/app/api/v1/cockpit/slices/route.ts` | `CockpitSlicesSchema` |
| GET | `/api/v1/reports/artifacts/:id` | `apps/web/app/api/v1/reports/artifacts/[id]/route.ts` | Elite report JSON (phase4) |
| GET | `/api/v1/reports/engagement-trend` | `apps/web/app/api/v1/reports/engagement-trend/route.ts` | `EngagementTrendSchema` (phase14, CLOUD-C6) — fixture source labelled `fixture`; live without DB → 500, never empty "live" |

### Jarvis vault tools (CLOUD-C3, phase7 `memory-vault.ts`)

| Tool | Risk tier | Args | Notes |
|------|-----------|------|-------|
| `vault_list` | read | `{ kind?, limit? }` | `VaultItemSchema[]` |
| `vault_pin` | write-low | `{ content }` | same content (case-insensitive) returns the existing item with `alreadyPinned: true` |
| `vault_forget` | write-high (confirm) | `{ id? , content? }` | no args → most recent pin; deletes `source='vault'` rows only; confirm text names the item |
| `memory_save` | write-low | `{ content, tags? }` | |

Memory saves also run the CLOUD-C5 semantic check: suspected near-miss contradictions are stored on the new entry as `metadata.suspectedContradictionOf: [{ id, reason }]` and never mark anything `contradicted`.

### Jarvis run + write-high confirm (K1)

`POST /api/v1/jarvis/run` — body `{ turnId: uuid, transcript, confirmed?: boolean, runId?: uuid }` (strict; unchanged shape).

- A write-high tool call stops the run with `terminalReason: "awaiting_confirm"` and `pendingConfirm: { toolName, args, argsHash }` (`argsHash` = kernel `hashArgs(args)`). The server records a **confirm grant** `{ runId, toolName, argsHash }` in an in-memory store (`apps/web/lib/jarvis/confirm-grants.ts`, TTL 5 min). No grant is recorded when `pendingConfirm` is dropped (e.g. `vault_forget` with nothing to forget).
- To approve, the client re-sends the same transcript with `confirmed: true` and the **same `runId`**. The server removes the grant (single use) and passes it to the kernel as `confirmGrant`. The kernel executes a write-high call only if `runId`, tool name and `hashArgs(args)` all match and the grant has not been used in this run; a second write-high call in the same run stops at `awaiting_confirm` again.
- `confirmed: true` with a missing, unknown, expired or already-used `runId` runs no tools and returns `terminalReason: "completed"`, no `pendingConfirm`, `resultText: "That confirmation has expired — please ask again."`.
- `confirmed` alone never approves anything. Voice "yes" turns reuse the stored `runId` the same way.
- A tool call naming a tool outside the registry is never executed (no fallback tier): the kernel emits a failed `tool_execute` step and finishes with `"I can't run that tool."`.

### RSC fetch

- `getCockpitSlices()` in `apps/web/lib/bff.ts` — direct server load via `loadCockpitSlices()` + Zod parse (no HTTP loopback)
- On failure throws **`CockpitBffError`** with optional HTTP `status` — **no silent empty panels** (ZR-004 / C137)
- Cockpit RSC pages propagate `CockpitBffError` to Next.js error boundaries (`cockpit/error.tsx`)

### Fixture mode

- `ZEREF_BFF_FIXTURE=1` — returns fixture slices without Postgres (CI / Playwright)

---

## pg-boss job types (worker)

Enqueued via `scripts/enqueue-*.mjs` (CLI only — no HTTP enqueue yet, ZR-044).

| jobType | Input schema | Output schema | Handler |
|---------|--------------|---------------|---------|
| `collect` | `CollectJobInputSchema` | `CollectJobOutputSchema` | `apps/worker/src/jobs/collect.ts` |
| `normalize` | `NormalizeJobInputSchema` | `NormalizeJobOutputSchema` | `apps/worker/src/jobs/normalize.ts` |
| `embed` | `EmbedJobInputSchema` | `EmbedJobOutputSchema` | `apps/worker/src/jobs/embed.ts` |
| `analyze` | `AnalyzeJobInputSchema` | `AnalyzeJobOutputSchema` | `apps/worker/src/jobs/analyze.ts` |
| `report` | `ReportJobInputSchema` | `ReportJobOutputSchema` | `apps/worker/src/jobs/report.ts` |

### Auto-chain policy

| After job | Condition | Action |
|-----------|-----------|--------|
| normalize | `ZEREF_AUTO_EMBED` enabled | inline `runEmbed()` |
| analyze | `ZEREF_AUTO_REPORT` enabled | inline `runReport()` |

Collect does **not** auto-chain normalize — operator must enqueue each stage or use future `run-pipeline.mjs`.

---

## Cockpit DTO (`CockpitSlicesSchema`)

Panels: `studio`, `calendar`, `reports`, `research` — summary items only; not full elite JSON.

Source: `packages/contracts/src/phase5/cockpit.ts`

---

## OpenAPI

Generated from Zod: `scripts/generate-openapi.mjs` (ADR-003)

---

## Planned (not implemented)

| Method | Path | Phase |
|--------|------|-------|
| GET | `/api/v1/events` (SSE) | 5.1 / 6 |
| POST | `/api/v1/jobs/enqueue` | 5.0.1+ |
| WebSocket | voice stream | 6 |

---

## Related

- [governance/phase-5-contract.md](./governance/phase-5-contract.md)
- [governance/adr/ADR-016-bff-cockpit-slices.md](./governance/adr/ADR-016-bff-cockpit-slices.md)
