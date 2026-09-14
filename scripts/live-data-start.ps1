# Live data operator path (Postgres + worker + web, fixture OFF).
# Usage from repo root:
#   .\scripts\live-data-start.ps1
#
# Requires DATABASE_URL in the environment or root .env.
# Does NOT set ZEREF_BFF_FIXTURE (live panels). College demo: .\scripts\demo-start.ps1
# Live voice (separate): .\scripts\live-voice-start.ps1 -- see docs/LIVE_VOICE_SETUP.md
# Instagram Graph: set INSTAGRAM_ACCESS_TOKEN + INSTAGRAM_GRAPH_USER_ID (never commit).

$ErrorActionPreference = "Stop"
Set-Location (Join-Path $PSScriptRoot "..")

function Read-DotEnvValue {
  param(
    [Parameter(Mandatory = $true)][string]$Path,
    [Parameter(Mandatory = $true)][string]$Key
  )
  if (-not (Test-Path $Path)) { return $null }
  foreach ($line in Get-Content $Path) {
    $trimmed = $line.Trim()
    if ($trimmed -eq "" -or $trimmed.StartsWith("#")) { continue }
    $eq = $trimmed.IndexOf("=")
    if ($eq -lt 1) { continue }
    $name = $trimmed.Substring(0, $eq).Trim()
    if ($name -ne $Key) { continue }
    $value = $trimmed.Substring($eq + 1).Trim()
    if (
      ($value.StartsWith('"') -and $value.EndsWith('"')) -or
      ($value.StartsWith("'") -and $value.EndsWith("'"))
    ) {
      $value = $value.Substring(1, $value.Length - 2)
    }
    return $value
  }
  return $null
}

if (-not $env:DATABASE_URL -or $env:DATABASE_URL.Trim() -eq "") {
  $fromEnvFile = Read-DotEnvValue -Path (Join-Path (Get-Location) ".env") -Key "DATABASE_URL"
  if ($fromEnvFile) {
    $env:DATABASE_URL = $fromEnvFile
  }
}

if (-not $env:DATABASE_URL -or $env:DATABASE_URL.Trim() -eq "") {
  Write-Host "DATABASE_URL is required for live data." -ForegroundColor Red
  Write-Host "Set it in the environment or root .env (see .env.example)." -ForegroundColor Yellow
  exit 1
}

# Live panels -- do NOT enable fixture / job mock
Remove-Item Env:ZEREF_BFF_FIXTURE -ErrorAction SilentlyContinue
Remove-Item Env:ZEREF_JOB_ENQUEUE_MOCK -ErrorAction SilentlyContinue
Remove-Item Env:ZEREF_MEMORY_MOCK -ErrorAction SilentlyContinue

# Clear AI mocks inherited from demo-start / prior shells (beep = sync-mock path).
# Keys stay in apps/web/.env.local (OPENROUTER_*, ELEVENLABS_*).
Remove-Item Env:ZEREF_LLM_MOCK -ErrorAction SilentlyContinue
Remove-Item Env:ZEREF_TTS_MOCK -ErrorAction SilentlyContinue
Remove-Item Env:ZEREF_WHISPER_MOCK -ErrorAction SilentlyContinue

# Prefer live AI; dedicated voice-only fixture path: .\scripts\live-voice-start.ps1

$env:ZEREF_WORKER_AVAILABLE = "1"
$env:ZEREF_PHASE8_PRODUCT = "1"
$env:ZEREF_PHASE9_RESEARCH = "1"
$env:ZEREF_PHASE11_AGENT = "1"
$env:ZEREF_PHASE12_DATA = "1"

Write-Host "=== Zeref LIVE DATA (fixture OFF, Docker db + worker + web) ===" -ForegroundColor Cyan
Write-Host "DATABASE_URL is set (value not printed)."
Write-Host "ZEREF_BFF_FIXTURE unset  ZEREF_JOB_ENQUEUE_MOCK unset"
Write-Host "AI mocks unset (LLM/TTS/Whisper) - need keys in apps/web/.env.local"
Write-Host "ZEREF_WORKER_AVAILABLE=$($env:ZEREF_WORKER_AVAILABLE)"
Write-Host ""
Write-Host "Reminder: set INSTAGRAM_ACCESS_TOKEN + INSTAGRAM_GRAPH_USER_ID for Graph collect." -ForegroundColor Yellow
Write-Host "Probe after ready: http://localhost:3000/api/v1/ops/instagram-health"
Write-Host "Voice probe: http://localhost:3000/api/v1/voice/health (all mocks should be false)"
Write-Host ""
Write-Host "College / offline demo: use .\scripts\demo-start.ps1 instead (fixture ON)." -ForegroundColor Yellow
Write-Host ""
Write-Host "Open after stack is ready:"
Write-Host "  http://localhost:3000/cockpit"
Write-Host "  http://localhost:3000/api/v1/ops/worker-health"
Write-Host ""

Write-Host "Starting npm run dev:stack ..." -ForegroundColor Cyan
npm run dev:stack
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
