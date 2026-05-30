# Do-not-repeat checklist (Zeref)

Synthesized from legacy **instagram-ops-studio** audit and Phase 0–5 governance. **These rules override agent defaults.**

---

## Pipeline and data (SEV-1)

- **No re-scrape in downstream jobs** — collect once; normalize/embed/analyze/report use snapshot IDs only (C6)
- **No monolithic analyze job** — stages stay separable; auto-chain is inline policy, not hidden scrape
- **No stub workers** — every pg-boss job type must have handler + tests before marking phase done
- **Single contracts source** — `@zeref/contracts` Zod schemas; no field name typos (`competitorBenchmark` not `Benchmarks`)
- **Snapshot immutability** — merged Instagram payload on collect; no dual graph/scrape rows per post

---

## Cockpit and BFF (SEV-1)

- **No silent empty cockpit** — if BFF fails, show error state; never return empty slices that look like "no data"
- **No fake metrics or theater telemetry** — scrolling logs must be real pipeline events or labeled `SIMULATED`
- **No client refetch storm** — RSC-first; no mount-time `fetch` with `cache: 'no-store'` on every panel
- **No full elite JSON in slices** — summary DTO only; detail via artifact route
- **No voice in Phase 5** — C30; voice is Phase 6+

---

## Verify and CI (SEV-1)

- **No verification theater** — "done" requires `verify:phase-N` green, not manual eyeball
- **No skipping Playwright in CI** — cockpit layout tests required (ADR-018)
- **No live API keys in default CI** — `ZEREF_LLM_MOCK`, `ZEREF_BFF_FIXTURE`, mock embed
- **Do not claim Phase 5 proves live DB BFF** — fixture mode is smoke only until ZR-005 fixed

---

## Ops and dev hygiene

- **No enqueue without worker daemon** — jobs sit in pg-boss until consumer runs (ZR-001)
- **No stale `.next` crashes** — use `npm run dev:clean` (removes `.next` + frees port 3000 on Windows)
- **Corrupted `.next` during recompile** — symptoms: `ENOENT prerender-manifest.json`, `Cannot find module './383.js'`, 500s for 30–80s; recovery: `dev:clean` + restart dev server; see [DEV_PERFORMANCE.md](./DEV_PERFORMANCE.md)
- **Do not hammer verify/Playwright during `next dev` recompile** — causes cache race
- **DATABASE_URL port must match docker-compose** — default `5432`; document custom `POSTGRES_PORT`

---

## Multi-agent process (SEV-2)

- **No Lead implementing worker paths** when task cards assign agents
- **No Phase 4-style single-pass** for Phases 5.1+ — separate agent chats with copy-paste prompts
- **No editing Planner `.cursor/plans/*.plan.md`** from orchestrator/worker chats

---

## UI / Jarvis HUD (Phase 5.1+)

- **No wireframe globe when Luke ref specifies point-cloud** — amend ADR-015 first
- **No generic purple AI gradient dashboard** — use DESIGN_SYSTEM + ui-ux-pro-max Jarvis aesthetic
- **No unbounded GPU bloat** — particle/triangle budget in ADR-015 amendment + verify perf smoke

---

## Security

- **No secrets in repo** — `.env` only local; never commit API keys
- **BFF-only browser API** — no direct worker DB access from client

---

## Related

- [legacy-ios.md](./handoff/legacy-ios.md)
- [GAP_BACKLOG.md](./GAP_BACKLOG.md)
- [COUNCIL_ORCHESTRATION.md](./COUNCIL_ORCHESTRATION.md)
