FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

COPY pyproject.toml README.md ./
COPY whisper_sidecar ./whisper_sidecar

RUN pip install --no-cache-dir .

ENV WHISPER_HOST=0.0.0.0
ENV WHISPER_PORT=8765
ENV WHISPER_MODEL=base
ENV WHISPER_DEVICE=cpu

EXPOSE 8765

CMD ["python", "-m", "whisper_sidecar.main"]
