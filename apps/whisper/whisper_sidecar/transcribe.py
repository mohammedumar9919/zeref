from __future__ import annotations

import os
import tempfile
from pathlib import Path
from typing import Protocol


class TranscribeService(Protocol):
    def transcribe(self, audio_bytes: bytes, filename: str | None = None) -> dict: ...


class FasterWhisperService:
    def __init__(self, model_name: str, device: str = "cpu", compute_type: str = "int8"):
        from faster_whisper import WhisperModel

        self.model_name = model_name
        self._model = WhisperModel(model_name, device=device, compute_type=compute_type)

    def transcribe(self, audio_bytes: bytes, filename: str | None = None) -> dict:
        if not audio_bytes:
            raise ValueError("empty audio")

        suffix = _suffix_for_filename(filename)
        tmp_path: str | None = None
        try:
            with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
                tmp.write(audio_bytes)
                tmp_path = tmp.name

            segments, info = self._model.transcribe(tmp_path)
            text = " ".join(segment.text.strip() for segment in segments).strip()
            if not text:
                raise ValueError("no speech detected")

            result: dict = {"text": text}
            if info.language:
                result["language"] = info.language
            if info.duration:
                result["durationMs"] = int(info.duration * 1000)
            return result
        finally:
            if tmp_path is not None:
                Path(tmp_path).unlink(missing_ok=True)


def build_transcribe_service(
    model_name: str,
    device: str = "cpu",
    compute_type: str = "int8",
) -> FasterWhisperService:
    return FasterWhisperService(
        model_name=model_name,
        device=device,
        compute_type=compute_type,
    )


def _suffix_for_filename(filename: str | None) -> str:
    if not filename:
        return ".wav"
    suffix = Path(filename).suffix.lower()
    if suffix in {".wav", ".webm", ".mp3", ".m4a", ".ogg", ".flac"}:
        return suffix
    return ".wav"
