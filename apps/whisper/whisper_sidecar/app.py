from __future__ import annotations

from typing import Any

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.responses import JSONResponse

from whisper_sidecar.config import Settings, load_settings
from whisper_sidecar.transcribe import TranscribeService, build_transcribe_service


def create_app(
    *,
    model_name: str | None = None,
    settings: Settings | None = None,
    transcribe_service: TranscribeService | None = None,
) -> FastAPI:
    resolved_settings = settings or load_settings()
    resolved_model = model_name or resolved_settings.model
    service = transcribe_service or build_transcribe_service(
        model_name=resolved_model,
        device=resolved_settings.device,
        compute_type=resolved_settings.compute_type,
    )

    app = FastAPI(title="Zeref Whisper STT Sidecar", version="0.1.0")

    @app.get("/health")
    def health() -> dict[str, Any]:
        return {"ok": True, "model": resolved_model}

    @app.post("/v1/transcribe")
    async def transcribe(audio: UploadFile = File(...)) -> JSONResponse:
        audio_bytes = await audio.read()
        if not audio_bytes:
            raise HTTPException(status_code=400, detail="audio file is empty")

        try:
            result = service.transcribe(audio_bytes, audio.filename)
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc

        return JSONResponse(content=result)

    return app


def create_default_app() -> FastAPI:
    return create_app()
