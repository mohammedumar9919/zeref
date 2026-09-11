# Cloud Agent base image for Zeref (Cursor Cloud Agents).
# Do NOT COPY the project — Cursor checks out the repo into the VM.
FROM node:22-bookworm-slim

RUN apt-get update \
  && apt-get install -y --no-install-recommends git ca-certificates curl \
  && rm -rf /var/lib/apt/lists/*

# Playwright browsers are installed on demand by verify scripts if needed.
# Default remote work uses ZEREF_BFF_FIXTURE=1 (no local Postgres required).
WORKDIR /workspace
