# Register (or remove) the Windows Task Scheduler job that runs scripts\watch-collect.ps1
# every N hours as the current user (CLOUD-C18b interim always-on).
# Usage from repo root:
#   .\scripts\register-watch-task.ps1 -WhatIf          # preview, changes nothing
#   .\scripts\register-watch-task.ps1                  # every 4 h, enqueue mode
#   .\scripts\register-watch-task.ps1 -IntervalHours 6 -Direct
#   .\scripts\register-watch-task.ps1 -Remove
#
# The task stores no secrets: watch-collect.ps1 reads .env at run time. Nothing secret is printed.

[CmdletBinding(SupportsShouldProcess = $true)]
param(
  [ValidateRange(1, 24)]
  [int]$IntervalHours = 4,
  [string]$TaskName = "Zeref Watch Collect",
  [switch]$Direct,
  [switch]$Remove
)

$ErrorActionPreference = "Stop"
$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$script = Join-Path $repoRoot "scripts\watch-collect.ps1"

if ($Remove) {
  if ($PSCmdlet.ShouldProcess($TaskName, "Unregister-ScheduledTask")) {
    Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false -ErrorAction SilentlyContinue
    Write-Host "Removed scheduled task '$TaskName' (if it existed)."
  }
  return
}

$argList = "-NoProfile -ExecutionPolicy Bypass -File `"$script`""
if ($Direct) { $argList += " -Direct" }

$action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument $argList -WorkingDirectory $repoRoot
$trigger = New-ScheduledTaskTrigger -Once -At (Get-Date).AddMinutes(5) `
  -RepetitionInterval (New-TimeSpan -Hours $IntervalHours)
$userId = if ($env:USERDOMAIN) { "$($env:USERDOMAIN)\$($env:USERNAME)" } else { $env:USERNAME }
$principal = New-ScheduledTaskPrincipal -UserId $userId -LogonType Interactive -RunLevel Limited
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -MultipleInstances IgnoreNew `
  -ExecutionTimeLimit (New-TimeSpan -Minutes 30)

Write-Host "Task:     $TaskName"
Write-Host "User:     $userId"
Write-Host "Every:    $IntervalHours h (first run in ~5 min)"
Write-Host "Command:  powershell.exe $argList"

if ($PSCmdlet.ShouldProcess($TaskName, "Register-ScheduledTask (every $IntervalHours h)")) {
  Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger `
    -Principal $principal -Settings $settings `
    -Description "Zeref own-account watch (CLOUD-C18b). Reads .env at run time; no secrets stored." `
    -Force | Out-Null
  Write-Host "Registered '$TaskName'. Remove with: .\scripts\register-watch-task.ps1 -Remove"
}
