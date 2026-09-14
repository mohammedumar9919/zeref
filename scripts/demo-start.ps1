# One-command fixture demo (Windows laptop) -- production feel, no Docker, no live keys.
# Usage from repo root:
#   .\scripts\demo-start.ps1
#
# Uses next build + next start so nav feels instant (DEV_PERFORMANCE.md / C121).
# For day-to-day coding with hot reload:
#   .\scripts\demo-start-dev.ps1
#
# Cloud Agents / Grok Bot: do not run this script. Runtime Secrets already
# include ZEREF_BFF_FIXTURE=1. Start web with: npm run dev -w @zeref/web
#
# Live AI voice (keys in apps/web/.env.local):
#   .\scripts\live-voice-start.ps1
#   See docs/LIVE_VOICE_SETUP.md

param(
  [switch]$SkipBuild
)

$ErrorActionPreference = "Stop"
Set-Location (Join-Path $PSScriptRoot "..")

# Fixture / mock flags -- offline cockpit without Postgres or API keys
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

$FixtureStudioEntityId = "550e8400-e29b-41d4-a716-446655440001"

Write-Host "=== Zeref fixture demo (prod start, no Docker) ===" -ForegroundColor Cyan
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

if (-not $SkipBuild) {
  Write-Host "Building @zeref/web (one-time cost; then instant nav) ..." -ForegroundColor Cyan
  npm run build -w @zeref/web
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
} else {
  Write-Host "SkipBuild: using existing apps/web/.next" -ForegroundColor Yellow
}

Write-Host "Starting npm run start -w @zeref/web ..." -ForegroundColor Cyan
npm run start -w @zeref/web
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
