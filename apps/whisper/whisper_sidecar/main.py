from __future__ import annotations

import uvicorn

from whisper_sidecar.app import create_default_app
from whisper_sidecar.config import load_settings


def main() -> None:
    settings = load_settings()
    app = create_default_app()
    uvicorn.run(
        app,
        host=settings.host,
        port=settings.port,
        log_level="info",
    )


if __name__ == "__main__":
    main()
