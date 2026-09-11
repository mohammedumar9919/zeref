# One-command fixture demo (Windows laptop) — no Docker, no live keys.
# Usage from repo root:
#   .\scripts\demo-start.ps1
#
# Cloud Agents / Grok Bot: do not run this script. Runtime Secrets already
# include ZEREF_BFF_FIXTURE=1 (and the other fixture mocks). Start web with:
#   npm run dev -w @zeref/web
#
# Laptop leftover (not this script): Postgres password reset / docker compose
# volume recreate. Never wipe volumes from here.

param()

$ErrorActionPreference = "Stop"
Set-Location (Join-Path $PSScriptRoot "..")

# Fixture / mock flags — offline cockpit without Postgres or API keys
$env:ZEREF_BFF_FIXTURE = "1"
$env:ZEREF_JOB_ENQUEUE_MOCK = "1"
$env:ZEREF_LLM_MOCK = "1"
$env:ZEREF_TTS_MOCK = "1"
$env:ZEREF_WHISPER_MOCK = "1"
$env:ZEREF_MEMORY_MOCK = "1"

# Product slices that fixture mode can render (same names as Cloud Secrets)
$env:ZEREF_PHASE51_UI = "1"
$env:ZEREF_PHASE6_VOICE = "1"
$env:ZEREF_PHASE7_BRAIN = "1"
$env:ZEREF_PHASE8_PRODUCT = "1"
$env:ZEREF_PHASE9_RESEARCH = "1"
$env:ZEREF_PHASE11_AGENT = "1"
$env:ZEREF_PHASE12_DATA = "1"

# Canonical fixture studio entity (CURRENT_STATE / fixtures/phase-5 + phase-8)
$FixtureStudioEntityId = "550e8400-e29b-41d4-a716-446655440001"

Write-Host "=== Zeref fixture demo (no Docker) ===" -ForegroundColor Cyan
Write-Host "ZEREF_BFF_FIXTURE=$($env:ZEREF_BFF_FIXTURE)  ZEREF_JOB_ENQUEUE_MOCK=$($env:ZEREF_JOB_ENQUEUE_MOCK)"
Write-Host ""
Write-Host "Fixture studio entity id:"
Write-Host "  $FixtureStudioEntityId" -ForegroundColor Yellow
Write-Host ""
Write-Host "Open after Next is ready:"
Write-Host "  http://localhost:3000/cockpit"
Write-Host "  http://localhost:3000/cockpit/studio/$FixtureStudioEntityId"
Write-Host "  http://localhost:3000/cockpit/calendar"
Write-Host ""
Write-Host "Cloud note: Secrets already have ZEREF_BFF_FIXTURE=1 — skip this script."
Write-Host "Starting npm run dev -w @zeref/web ..." -ForegroundColor Cyan

npm run dev -w @zeref/web
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
