from __future__ import annotations

import os
from dataclasses import dataclass


@dataclass(frozen=True)
class Settings:
    model: str
    device: str
    compute_type: str
    host: str
    port: int


def load_settings() -> Settings:
    device = os.getenv("WHISPER_DEVICE", "cpu")
    default_compute = "int8" if device == "cpu" else "float16"
    return Settings(
        model=os.getenv("WHISPER_MODEL", "base"),
        device=device,
        compute_type=os.getenv("WHISPER_COMPUTE_TYPE", default_compute),
        host=os.getenv("WHISPER_HOST", "127.0.0.1"),
        port=int(os.getenv("WHISPER_PORT", "8765")),
    )
