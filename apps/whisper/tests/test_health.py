from fastapi.testclient import TestClient

from tests.conftest import MockTranscribeService
from whisper_sidecar.app import create_app


def test_health_returns_ok_and_model() -> None:
    app = create_app(model_name="tiny", transcribe_service=MockTranscribeService())
    client = TestClient(app)

    response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {"ok": True, "model": "tiny"}
