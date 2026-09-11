# Fixtures

Canonical JSON used by `@zeref/contracts` tests, BFF fixture mode (`ZEREF_BFF_FIXTURE=1`), and verify gates. **No live secrets.** Do not treat fixture rows as production Instagram data.

## Demo entity (fixture mode only)

When `ZEREF_BFF_FIXTURE=1`, Studio resolves this entity and 404s any other id (Postgres is not required):

| Field | Value |
|-------|--------|
| Studio entity id | `550e8400-e29b-41d4-a716-446655440001` |
| Snapshot id | `550e8400-e29b-41d4-a716-446655440002` |
| Report artifact id | `550e8400-e29b-41d4-a716-446655440000` |
| Title | LOG240 ride log |

**Editor URL:** `/cockpit/studio/550e8400-e29b-41d4-a716-446655440001`

Source of truth for that id: [docs/CURRENT_STATE.md](../docs/CURRENT_STATE.md) (Phase 8 local UAT). Same id appears in:

- `fixtures/phase-5/cockpit-slices.fixture.json`
- `fixtures/phase-5/cockpit-slices.valid.json`
- `fixtures/phase-8/studio-draft.valid.json`
- `fixtures/phase-8/cockpit-slices.valid.json`
- `fixtures/phase-8/job-enqueue.valid.json`
- `fixtures/phase-8/calendar-event.valid.json`

## One-command start

**Windows laptop (no Docker):**

```powershell
.\scripts\demo-start.ps1
```

**Cloud Agents:** `ZEREF_BFF_FIXTURE=1` is already a Runtime Secret. Run `npm run dev -w @zeref/web` — do not copy laptop `.env` or wipe Docker volumes.

See [docs/REMOTE_AGENTS.md](../docs/REMOTE_AGENTS.md) and [docs/cloud/phases/A0-demo-ops.md](../docs/cloud/phases/A0-demo-ops.md).
