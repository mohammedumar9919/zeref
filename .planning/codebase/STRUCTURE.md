# STRUCTURE — Zeref

```
zeref/
├── apps/
│   ├── web/                 # Next.js cockpit + BFF
│   │   ├── app/cockpit/     # RSC panel pages
│   │   ├── app/api/v1/      # BFF routes
│   │   ├── components/      # globe, cockpit grid
│   │   └── lib/bff.ts       # RSC fetch (error swallow bug)
│   ├── worker/              # pg-boss handlers (no start script)
│   └── api/                 # Phase 0 stub
├── packages/
│   ├── contracts/           # Zod schemas + phase markers
│   ├── db/                  # Drizzle + migrations
│   ├── instagram/           # collect + merge
│   ├── analytics/           # analyze helpers
│   ├── reports/             # elite report builder
│   └── domain/              # stub
├── scripts/
│   ├── verify-phase-*.mjs   # phase gates
│   └── enqueue-*.mjs        # CLI job enqueue
├── docs/
│   ├── governance/          # phase contracts, ADRs, verify
│   ├── design/              # DESIGN_SYSTEM, reference JPEG
│   └── handoff/             # legacy-ios
├── .planning/               # GSD state + codebase index
├── .cursor/                 # GSD, council, uipro skills
├── config/council/          # zeref-board.yaml (pending)
├── fixtures/                # phase fixtures
└── .github/workflows/ci.yml
```

---

## Key entry points

| Entry | Path |
|-------|------|
| Cockpit page | `apps/web/app/cockpit/page.tsx` |
| BFF slices | `apps/web/app/api/v1/cockpit/slices/route.ts` |
| Worker export | `apps/worker/src/index.ts` → `startWorker` |
| Collect handler | `apps/worker/src/jobs/collect.ts` |
| CI gate | `.github/workflows/ci.yml` |
