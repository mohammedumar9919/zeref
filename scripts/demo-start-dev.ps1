# Fixture demo with Next.js turbopack (coding / hot reload).
# Nav will be slower than .\scripts\demo-start.ps1 (prod start) -- expected.
# Usage:
#   .\scripts\demo-start-dev.ps1

$ErrorActionPreference = "Stop"
Set-Location (Join-Path $PSScriptRoot "..")

$env:ZEREF_BFF_FIXTURE = "1"
$env:ZEREF_JOB_ENQUEUE_MOCK = "1"
$env:ZEREF_LLM_MOCK = "1"
$env:ZEREF_TTS_MOCK = "1"
$env:ZEREF_WHISPER_MOCK = "1"
$env:ZEREF_MEMORY_MOCK = "1"
$env:ZEREF_PHASE51_UI = "1"
$env:ZEREF_PHASE6_VOICE = "1"
$env:ZEREF_PHASE7_BRAIN = "1"
$env:ZEREF_PHASE8_PRODUCT = "1"
$env:ZEREF_PHASE9_RESEARCH = "1"
$env:ZEREF_PHASE11_AGENT = "1"
$env:ZEREF_PHASE12_DATA = "1"

Write-Host "=== Zeref fixture DEV (turbopack) ===" -ForegroundColor Cyan
Write-Host "For instant evaluator feel use: .\scripts\demo-start.ps1" -ForegroundColor Yellow
Write-Host "Starting npm run dev -w @zeref/web ..." -ForegroundColor Cyan

npm run dev -w @zeref/web
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
