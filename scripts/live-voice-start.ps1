# Live AI voice + fixture cockpit (honest data-age badges).
# Prerequisites: apps/web/.env.local with keys -- see docs/LIVE_VOICE_SETUP.md
#
# Usage from repo root:
#   .\scripts\live-voice-start.ps1
#   .\scripts\live-voice-start.ps1 -SkipBuild
#   .\scripts\live-voice-start.ps1 -Dev   # turbopack instead of prod start

param(
  [switch]$SkipBuild,
  [switch]$Dev,
  [switch]$MockWhisper,
  [switch]$MockTts
)

$ErrorActionPreference = "Stop"
Set-Location (Join-Path $PSScriptRoot "..")

$envLocal = Join-Path (Get-Location) "apps\web\.env.local"
if (-not (Test-Path $envLocal)) {
  Write-Host "Missing apps\web\.env.local" -ForegroundColor Red
  Write-Host "Copy the template from docs/LIVE_VOICE_SETUP.md and add your keys." -ForegroundColor Yellow
  exit 1
}

# Keep cockpit / jobs / memory honest as fixture (college demo safe)
$env:ZEREF_BFF_FIXTURE = "1"
$env:ZEREF_JOB_ENQUEUE_MOCK = "1"
$env:ZEREF_MEMORY_MOCK = "1"

# Do NOT force LLM mock -- OpenRouter key in .env.local must drive live LLM
Remove-Item Env:ZEREF_LLM_MOCK -ErrorAction SilentlyContinue

if ($MockWhisper) {
  $env:ZEREF_WHISPER_MOCK = "1"
} else {
  Remove-Item Env:ZEREF_WHISPER_MOCK -ErrorAction SilentlyContinue
}

if ($MockTts) {
  $env:ZEREF_TTS_MOCK = "1"
} else {
  Remove-Item Env:ZEREF_TTS_MOCK -ErrorAction SilentlyContinue
}

$env:ZEREF_PHASE51_UI = "1"
$env:ZEREF_PHASE6_VOICE = "1"
$env:ZEREF_PHASE7_BRAIN = "1"
$env:ZEREF_PHASE8_PRODUCT = "1"
$env:ZEREF_PHASE9_RESEARCH = "1"
$env:ZEREF_PHASE11_AGENT = "1"
$env:ZEREF_PHASE12_DATA = "1"

Write-Host "=== Zeref LIVE VOICE (fixture cockpit) ===" -ForegroundColor Cyan
Write-Host "BFF fixture=1 (panels stay Fixture-labeled)"
Write-Host "LLM mock UNSET (requires OPENROUTER_API_KEY in .env.local)"
Write-Host "Whisper mock=$($env:ZEREF_WHISPER_MOCK)  TTS mock=$($env:ZEREF_TTS_MOCK)"
Write-Host ""
Write-Host "After ready:"
Write-Host "  http://localhost:3000/cockpit"
Write-Host "  http://localhost:3000/api/v1/voice/health"
Write-Host ""

if ($Dev) {
  Write-Host "Starting turbopack dev ..." -ForegroundColor Cyan
  npm run dev -w @zeref/web
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
  exit 0
}

if (-not $SkipBuild) {
  Write-Host "Building @zeref/web ..." -ForegroundColor Cyan
  npm run build -w @zeref/web
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
}

Write-Host "Starting prod server ..." -ForegroundColor Cyan
npm run start -w @zeref/web
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
