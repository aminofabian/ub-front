# Dev-checkout helper: install Till Print Bridge as a Windows logon task + Startup entry.
# Prefer the download zip installer for till PCs:
#   Install-Palmart-Print-Bridge.cmd
#
# From a frontend checkout:
#   Set-ExecutionPolicy -Scope Process Bypass
#   .\scripts\install-till-print-bridge-task.ps1

$ErrorActionPreference = "Stop"

$FrontendDir = Split-Path -Parent $PSScriptRoot
$Bridge = Join-Path $FrontendDir "scripts\till-print-bridge.mjs"
if (-not (Test-Path $Bridge)) {
  throw "Missing $Bridge"
}

$KitInstaller = Join-Path $PSScriptRoot "download-kit\Install-Palmart-Print-Bridge.ps1"
if (Test-Path $KitInstaller) {
  # Stage like a download package so the real installer path is used.
  $Stage = Join-Path $env:TEMP "palmart-till-print-bridge-dev-stage"
  New-Item -ItemType Directory -Force -Path $Stage | Out-Null
  Copy-Item -Force $Bridge (Join-Path $Stage "till-print-bridge.mjs")
  Copy-Item -Force $KitInstaller (Join-Path $Stage "Install-Palmart-Print-Bridge.ps1")
  Copy-Item -Force (Join-Path $PSScriptRoot "start-till-print-bridge.cmd") (Join-Path $Stage "start-till-print-bridge.cmd") -ErrorAction SilentlyContinue
  & (Join-Path $Stage "Install-Palmart-Print-Bridge.ps1")
  exit $LASTEXITCODE
}

throw "Missing download-kit installer at $KitInstaller"
