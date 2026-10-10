# Own-account watch: trigger one run (CLOUD-C18b). Used by Windows Task Scheduler.
# Usage from anywhere:
#   .\scripts\watch-collect.ps1            # enqueue one task_scheduler run for the running worker
#   .\scripts\watch-collect.ps1 -Direct    # run in this process (no worker needed)
#
# Loads .env (and apps\web\.env.local) for missing vars. Secret values are never printed.
# Requires a build: npm run build. Docs: docs/cloud/phases/C18b-own-account-watch.md

param(
  [switch]$Direct,
  [ValidateSet("task_scheduler", "on_demand")]
  [string]$Trigger = "task_scheduler"
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

foreach ($key in @(
  "DATABASE_URL",
  "INSTAGRAM_ACCESS_TOKEN",
  "INSTAGRAM_GRAPH_USER_ID",
  "INSTAGRAM_APP_TOKEN",
  "ZEREF_WATCH_ENABLED",
  "ZEREF_GRAPH_DAILY_CAP",
  "ZEREF_COLLECT_SHORTCODES",
  "ZEREF_COLLECT_GRAPH_MEDIA_ID"
)) { Ensure-Env $key }

$cli = Join-Path (Get-Location) "apps\worker\dist\cli\watch-trigger.js"
if (-not (Test-Path $cli)) {
  Write-Host "Worker not built ($cli missing). Run: npm run build" -ForegroundColor Yellow
  exit 1
}
if (-not $env:DATABASE_URL) {
  Write-Host "DATABASE_URL missing - set it in .env" -ForegroundColor Yellow
  exit 1
}

$mode = if ($Direct) { "direct" } else { "enqueue" }
Write-Host "=== Zeref watch run (CLOUD-C18b) trigger=$Trigger mode=$mode ===" -ForegroundColor Cyan
Write-Host ("INSTAGRAM_ACCESS_TOKEN " + $(if ($env:INSTAGRAM_ACCESS_TOKEN) { "is set (value not printed)" } else { "missing - run will record skipped_no_token" }))
Write-Host ("ZEREF_WATCH_ENABLED=" + $(if ($env:ZEREF_WATCH_ENABLED -eq "1") { "1" } else { "off - run will record skipped_disabled" }))

$nodeArgs = @($cli, "--trigger", $Trigger)
if ($Direct) { $nodeArgs += "--direct" }
& node @nodeArgs
exit $LASTEXITCODE
