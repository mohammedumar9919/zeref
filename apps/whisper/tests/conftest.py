from __future__ import annotations

import io
import math
import struct
import wave
from dataclasses import dataclass, field
from pathlib import Path

import pytest

FIXTURES_DIR = Path(__file__).parent / "fixtures"


def make_mono_wav_bytes(
    duration_s: float = 0.5,
    sample_rate: int = 16000,
    frequency: float = 440.0,
) -> bytes:
    n_frames = int(duration_s * sample_rate)
    buf = io.BytesIO()
    with wave.open(buf, "wb") as wav:
        wav.setnchannels(1)
        wav.setsampwidth(2)
        wav.setframerate(sample_rate)
        frames = bytearray()
        for i in range(n_frames):
            sample = int(32767 * 0.3 * math.sin(2 * math.pi * frequency * i / sample_rate))
            frames.extend(struct.pack("<h", sample))
        wav.writeframes(bytes(frames))
    return buf.getvalue()


@pytest.fixture(scope="session", autouse=True)
def ensure_sample_wav_fixture() -> None:
    FIXTURES_DIR.mkdir(parents=True, exist_ok=True)
    sample_path = FIXTURES_DIR / "sample.wav"
    if not sample_path.exists():
        sample_path.write_bytes(make_mono_wav_bytes())


@pytest.fixture
def sample_wav_bytes() -> bytes:
    return make_mono_wav_bytes()


@dataclass
class MockTranscribeService:
    result: dict = field(
        default_factory=lambda: {
            "text": "hello jarvis",
            "language": "en",
            "durationMs": 500,
        }
    )
    calls: list[tuple[bytes, str | None]] = field(default_factory=list)

    def transcribe(self, audio_bytes: bytes, filename: str | None = None) -> dict:
        if not audio_bytes:
            raise ValueError("empty audio")
        self.calls.append((audio_bytes, filename))
        return dict(self.result)
