# Live Facebook Business Discovery UAT (CLOUD-B4). DATABASE_URL is NOT required.
# Usage from repo root:
#   .\scripts\live-competitor-check.ps1
#   .\scripts\live-competitor-check.ps1 -Username nasa
#
# Requires FACEBOOK_ACCESS_TOKEN + FACEBOOK_IG_BUSINESS_ID in the environment,
# root .env, or apps/web/.env.local. Values are never printed.
# Docs: docs/LIVE_COMPETITOR_SETUP.md

param(
  [string]$Username = "nasa"
)

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

function Ensure-FacebookEnv {
  param([string]$Key)
  $existing = [Environment]::GetEnvironmentVariable($Key, "Process")
  if ($existing -and $existing.Trim() -ne "") { return }
  $fromRoot = Read-DotEnvValue -Path (Join-Path (Get-Location) ".env") -Key $Key
  if ($fromRoot) {
    [Environment]::SetEnvironmentVariable($Key, $fromRoot, "Process")
    return
  }
  $fromLocal = Read-DotEnvValue -Path (Join-Path (Get-Location) "apps\web\.env.local") -Key $Key
  if ($fromLocal) {
    [Environment]::SetEnvironmentVariable($Key, $fromLocal, "Process")
  }
}

Ensure-FacebookEnv -Key "FACEBOOK_ACCESS_TOKEN"
Ensure-FacebookEnv -Key "FACEBOOK_IG_BUSINESS_ID"

Write-Host "=== Zeref competitor BD UAT (graph.facebook.com) ===" -ForegroundColor Cyan
Write-Host "DATABASE_URL is not required for this check."
Write-Host "Username: $Username"
if ($env:FACEBOOK_ACCESS_TOKEN -and $env:FACEBOOK_ACCESS_TOKEN.Trim() -ne "") {
  Write-Host "FACEBOOK_ACCESS_TOKEN is set (value not printed)."
} else {
  Write-Host "FACEBOOK_ACCESS_TOKEN is missing — script will soft-fail with a setup hint." -ForegroundColor Yellow
}
if ($env:FACEBOOK_IG_BUSINESS_ID -and $env:FACEBOOK_IG_BUSINESS_ID.Trim() -ne "") {
  Write-Host "FACEBOOK_IG_BUSINESS_ID is set (value not printed)."
} else {
  Write-Host "FACEBOOK_IG_BUSINESS_ID is missing — script will soft-fail with a setup hint." -ForegroundColor Yellow
}
Write-Host "Setup: docs/LIVE_COMPETITOR_SETUP.md"
Write-Host ""

node scripts/uat-competitor.mjs --username $Username
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
