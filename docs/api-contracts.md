# Zeref — API and job contracts

**Version:** Phase 5 (`PHASE5_CONTRACT_VERSION` in `@zeref/contracts`)  
**BFF location:** `apps/web/app/api/v1/` (ADR-016 — not `apps/api`)

Council Stage 2 required for changes to this file or underlying Zod schemas.

---

## HTTP BFF (browser-facing)

| Method | Path | Handler | Response schema |
|--------|------|---------|-----------------|
| GET | `/api/v1/cockpit/slices` | `apps/web/app/api/v1/cockpit/slices/route.ts` | `CockpitSlicesSchema` |
| GET | `/api/v1/reports/artifacts/:id` | `apps/web/app/api/v1/reports/artifacts/[id]/route.ts` | Elite report JSON (phase4) |

### RSC fetch

- `getCockpitSlices()` in `apps/web/lib/bff.ts` — server fetch + Zod parse
- **Known gap:** returns `EMPTY_COCKPIT_SLICES` on error (should surface error — ZR-004)

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
