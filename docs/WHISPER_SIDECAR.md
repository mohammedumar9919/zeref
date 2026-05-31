# Whisper STT sidecar (optional compose)

The sidecar is **not** part of CI. Local dev can run it from `apps/whisper/` or via an optional Docker service.

## Optional `docker-compose.yml` snippet

Add under `services:` (not merged into repo `docker-compose.yml` by default):

```yaml
  whisper:
    build:
      context: ./apps/whisper
      dockerfile: Dockerfile
    restart: unless-stopped
    ports:
      - "127.0.0.1:8765:8765"
    environment:
      WHISPER_MODEL: ${WHISPER_MODEL:-base}
      WHISPER_DEVICE: ${WHISPER_DEVICE:-cpu}
      WHISPER_HOST: 0.0.0.0
      WHISPER_PORT: "8765"
```

Use `WHISPER_HOST=0.0.0.0` inside the container; publish only on loopback.

## BFF mock in CI

Set `ZEREF_WHISPER_MOCK=1` so verify and GitHub Actions skip the sidecar. See [apps/whisper/README.md](../apps/whisper/README.md).

## Related

- [ADR-020](./governance/adr/ADR-020-whisper-stt-sidecar.md)
- [Phase 6 contract](./governance/phase-6-contract.md) (Q1, C51)
