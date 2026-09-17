# Live bulk Graph collect for cockpit freshness (CLOUD-B5).
# Usage from repo root:
#   .\scripts\live-collect-recent.ps1
#   .\scripts\live-collect-recent.ps1 -Limit 5
#
# Requires INSTAGRAM_ACCESS_TOKEN + DATABASE_URL. Values never printed.
# Docs: docs/LIVE_INSTAGRAM_SETUP.md · docs/cloud/phases/B5-pipeline-freshness.md

param(
  [int]$Limit = 5
)

$ErrorActionPreference = "Stop"
Set-Location (Join-Path $PSScriptRoot "..")

function Read-DotEnvValue {
  param([string]$Path, [string]$Key)
  if (-not (Test-Path $Path)) { return $null }
  foreach ($line in Get-Content $Path) {
    $trimmed = $line.Trim()
    if ($trimmed -eq "" -or $trimmed.StartsWith("#")) { continue }
    $eq = $trimmed.IndexOf("=")
    if ($eq -lt 1) { continue }
    if ($trimmed.Substring(0, $eq).Trim() -ne $Key) { continue }
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

function Ensure-Env([string]$Key) {
  $existing = [Environment]::GetEnvironmentVariable($Key, "Process")
  if ($existing -and $existing.Trim() -ne "") { return }
  foreach ($path in @((Join-Path (Get-Location) ".env"), (Join-Path (Get-Location) "apps\web\.env.local"))) {
    $from = Read-DotEnvValue -Path $path -Key $Key
    if ($from) {
      [Environment]::SetEnvironmentVariable($Key, $from, "Process")
      return
    }
  }
}

Ensure-Env "INSTAGRAM_ACCESS_TOKEN"
Ensure-Env "INSTAGRAM_GRAPH_USER_ID"
Ensure-Env "DATABASE_URL"

Write-Host "=== Zeref bulk recent Graph collect (CLOUD-B5) ===" -ForegroundColor Cyan
Write-Host "Limit: $Limit"
if ($env:INSTAGRAM_ACCESS_TOKEN) {
  Write-Host "INSTAGRAM_ACCESS_TOKEN is set (value not printed)."
} else {
  Write-Host "INSTAGRAM_ACCESS_TOKEN missing - script will soft-fail with a setup hint." -ForegroundColor Yellow
}
Write-Host "Setup: docs/LIVE_INSTAGRAM_SETUP.md"
Write-Host ""

node scripts/uat-collect-recent.mjs --limit $Limit
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
