# @zeref/whisper — faster-whisper STT sidecar

Python sidecar for Jarvis push-to-talk. Transcription runs outside the Next.js bundle; the BFF proxies browser audio to this service on loopback only.

**ADR:** [docs/governance/adr/ADR-020-whisper-stt-sidecar.md](../../docs/governance/adr/ADR-020-whisper-stt-sidecar.md)

---

## Requirements

- Python **3.11+**
- CPU (default) or CUDA GPU
- ~150 MB disk for `tiny` model; ~150 MB for `base` (dev default)

---

## Install

```powershell
cd c:\Projects\zeref\apps\whisper
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -e ".[dev]"
```

---

## Model download

Models download automatically on first transcribe request via Hugging Face (`Systran/faster-whisper-*`). No separate download step is required.

| Env | Default | Notes |
|-----|---------|-------|
| `WHISPER_MODEL` | `base` | Use `tiny` for faster local smoke tests |
| `WHISPER_DEVICE` | `cpu` | Set `cuda` when GPU available |
| `WHISPER_COMPUTE_TYPE` | `int8` (cpu) / `float16` (cuda) | Override if needed |
| `WHISPER_HOST` | `127.0.0.1` | Do not expose publicly |
| `WHISPER_PORT` | `8765` | BFF expects this default |

Pre-warm (optional):

```powershell
$env:WHISPER_MODEL = "tiny"
python -c "from whisper_sidecar.transcribe import build_transcribe_service; build_transcribe_service('tiny')"
```

---

## Start

```powershell
cd c:\Projects\zeref\apps\whisper
.\.venv\Scripts\Activate.ps1
$env:WHISPER_MODEL = "base"
python -m whisper_sidecar.main
```

Or after install:

```powershell
zeref-whisper
```

Listens on **`http://127.0.0.1:8765`**.

---

## API

### `GET /health`

```json
{ "ok": true, "model": "base" }
```

### `POST /v1/transcribe`

`multipart/form-data` with field **`audio`** (wav, webm, mp3, etc.).

Response:

```json
{
  "text": "transcribed utterance",
  "language": "en",
  "durationMs": 1234
}
```

`language` and `durationMs` are omitted when unavailable.

---

## Manual verification

**Health** (sidecar running):

```powershell
curl.exe -s http://127.0.0.1:8765/health
```

Expected: `{"ok":true,"model":"base"}` (model matches `WHISPER_MODEL`).

**Transcribe** (requires model download on first run; use `WHISPER_MODEL=tiny` for a quick test):

```powershell
curl.exe -s -X POST http://127.0.0.1:8765/v1/transcribe `
  -F "audio=@tests/fixtures/sample.wav;type=audio/wav"
```

The fixture is a 0.5 s 440 Hz tone — Whisper typically returns **400** `no speech detected` (expected). A **200** with a JSON `text` field confirms the pipeline when using real speech audio; record a short wav saying "hello jarvis" for that check.

---

## Tests

Unit tests mock faster-whisper (no model download in CI):

```powershell
python -m pytest tests/ -v
```

---

## CI / BFF mock (`ZEREF_WHISPER_MOCK=1`)

Phase 6 verify and GitHub Actions **do not** run this Python sidecar. When `ZEREF_WHISPER_MOCK=1`, the BFF (P6-C) returns a fixture transcript without calling `127.0.0.1:8765`.

| Context | Sidecar | STT source |
|---------|---------|------------|
| Local dev (live voice) | Run manually | BFF → sidecar |
| CI / `verify:phase-6` | Not started | BFF mock |

This sidecar is **optional for green CI**; it is **required for live PTT** in dev.

---

## Docker Compose (optional)

See [docs/WHISPER_SIDECAR.md](../../docs/WHISPER_SIDECAR.md) for an optional compose service snippet. Not used in CI.

---

## Security

- Bind **`127.0.0.1` only** — BFF proxy, never browser-direct.
- No API keys in this service.
