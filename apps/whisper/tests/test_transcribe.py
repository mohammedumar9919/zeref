from fastapi.testclient import TestClient

from tests.conftest import MockTranscribeService
from whisper_sidecar.app import create_app


def test_transcribe_returns_text_language_and_duration(sample_wav_bytes: bytes) -> None:
    service = MockTranscribeService(
        result={"text": "hello jarvis", "language": "en", "durationMs": 512}
    )
    app = create_app(model_name="tiny", transcribe_service=service)
    client = TestClient(app)

    response = client.post(
        "/v1/transcribe",
        files={"audio": ("sample.wav", sample_wav_bytes, "audio/wav")},
    )

    assert response.status_code == 200
    assert response.json() == {
        "text": "hello jarvis",
        "language": "en",
        "durationMs": 512,
    }
    assert len(service.calls) == 1
    assert service.calls[0][1] == "sample.wav"


def test_transcribe_omits_optional_fields_when_not_provided(
    sample_wav_bytes: bytes,
) -> None:
    service = MockTranscribeService(result={"text": "only text"})
    app = create_app(model_name="tiny", transcribe_service=service)
    client = TestClient(app)

    response = client.post(
        "/v1/transcribe",
        files={"audio": ("clip.webm", sample_wav_bytes, "audio/webm")},
    )

    assert response.status_code == 200
    assert response.json() == {"text": "only text"}


def test_transcribe_rejects_missing_audio_field() -> None:
    app = create_app(model_name="tiny", transcribe_service=MockTranscribeService())
    client = TestClient(app)

    response = client.post("/v1/transcribe")

    assert response.status_code == 422


def test_transcribe_rejects_empty_audio_file() -> None:
    app = create_app(model_name="tiny", transcribe_service=MockTranscribeService())
    client = TestClient(app)

    response = client.post(
        "/v1/transcribe",
        files={"audio": ("empty.wav", b"", "audio/wav")},
    )

    assert response.status_code == 400
    assert response.json()["detail"] == "audio file is empty"


def test_transcribe_maps_service_errors_to_400(sample_wav_bytes: bytes) -> None:
    class FailingService:
        def transcribe(self, audio_bytes: bytes, filename: str | None = None) -> dict:
            raise ValueError("unsupported audio format")

    app = create_app(model_name="tiny", transcribe_service=FailingService())
    client = TestClient(app)

    response = client.post(
        "/v1/transcribe",
        files={"audio": ("bad.bin", sample_wav_bytes, "application/octet-stream")},
    )

    assert response.status_code == 400
    assert response.json()["detail"] == "unsupported audio format"
