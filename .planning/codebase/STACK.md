# STACK — Zeref

**Generated:** 2026-05-30 (initial index for GSD map-codebase)

---

## Runtime

| Layer | Technology | Version |
|-------|------------|---------|
| Language | TypeScript | 5.9 |
| Runtime | Node.js | ≥22 |
| Package manager | npm workspaces | 10 |
| Web | Next.js | 15 (App Router) |
| UI | React 19, CSS modules / globals | — |
| 3D | Three.js (globe client island) | — |
| Worker | pg-boss | 10 |
| Database | PostgreSQL 16 + pgvector | Docker |
| ORM | Drizzle | — |
| Validation | Zod (@zeref/contracts) | — |
| Testing | node:test, Playwright | — |
| CI | GitHub Actions | ubuntu-latest |

---

## Planned (not in repo)

| Component | Tech |
|-----------|------|
| STT | faster-whisper (`apps/whisper` Python) |
| LLM | OpenRouter |
| TTS | ElevenLabs primary, OpenAI fallback |
| Memory | `packages/zeref-memory` |

---

## Dev services

```yaml
# docker-compose.yml
db: pgvector/pgvector:pg16 @ POSTGRES_PORT (default 5432)
```

No Redis/RabbitMQ — pg-boss uses Postgres.
