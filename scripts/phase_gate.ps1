param(
  [Parameter(Mandatory = $true)]
  [ValidateRange(0, 5)]
  [int]$Phase
)

$ErrorActionPreference = "Stop"
Set-Location (Join-Path $PSScriptRoot "..")

if (-not $env:DATABASE_URL) {
  $env:DATABASE_URL = "postgres://zeref:zeref@localhost:5432/zeref"
}
if (-not $env:ZEREF_LLM_MOCK) {
  $env:ZEREF_LLM_MOCK = "1"
}
if ($Phase -ge 5 -and -not $env:ZEREF_BFF_FIXTURE) {
  $env:ZEREF_BFF_FIXTURE = "1"
}

Write-Host "=== build ===" -ForegroundColor Cyan
npm run build
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "=== lint ===" -ForegroundColor Cyan
npm run lint
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

for ($i = 0; $i -le $Phase; $i++) {
  Write-Host "=== verify:phase-$i ===" -ForegroundColor Cyan
  npm run "verify:phase-$i"
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
}

Write-Host "Phase gate $Phase OK" -ForegroundColor Green
