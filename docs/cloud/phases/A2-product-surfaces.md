# CLOUD-A2 — Product surfaces polish

**Queue ID:** CLOUD-A2  
**Depends on:** CLOUD-P62 preferably merged (can start if blocked on visual UAT only)  
**Remote:** Yes

## Goal

Kill the “JSON app” look using data that already exists.

## Work items (one PR or split with Lead approval)

1. **Reports** — Replace raw `<pre>` in ReportArtifactDetail with narrative + 2–3 simple charts from elite JSON (add a small chart lib if needed).
2. **Studio** — Show `thumbnailUrl` / media preview; optional caption/hook assist UI wired to existing APIs/tools.
3. **Calendar** — Content slots (caption + media + time) as first-class UX; keep job enqueue as advanced.
4. **Research** — Render `payloadJson` as readable cards (even before A3 outlier math).

## Allowed paths

- `apps/web/components/reports/**`, `studio/**`, `calendar/**`, `research/**`
- `apps/web/app/cockpit/**` related pages
- `apps/web/package.json` (chart dependency)
- Fixtures under `fixtures/**` if seeding richer demo data
- Scoped tests / e2e for hubs

## Forbidden

- New Instagram scrape pipelines
- Meta publish
- Worker job rewrites unless required for a tiny contract field (ask first)

## Acceptance

- [ ] Non-engineer can read a report without seeing raw JSON dumps as the primary UI
- [ ] Studio shows media when fixture/payload has URLs
- [ ] Research cards show payload insights
- [ ] PR + AGENT_LOG
