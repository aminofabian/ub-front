# Dev-checkout helper: install Till Print Bridge as a Windows logon task + Startup entry.
# Prefer the download zip installer for till PCs:
#   Install-Palmart-Print-Bridge.cmd
#
# From a frontend checkout:
#   Set-ExecutionPolicy -Scope Process Bypass
#   .\scripts\install-till-print-bridge-task.ps1

$ErrorActionPreference = "Stop"

$Bridge = Join-Path $PSScriptRoot "till-print-bridge-windows.ps1"
$Raw = Join-Path $PSScriptRoot "windows-raw-print.ps1"
$KitInstaller = Join-Path $PSScriptRoot "download-kit\Install-Palmart-Print-Bridge.ps1"

if (-not (Test-Path $Bridge)) {
  throw "Missing $Bridge"
}
if (-not (Test-Path $Raw)) {
  throw "Missing $Raw"
}
if (-not (Test-Path $KitInstaller)) {
  throw "Missing download-kit installer at $KitInstaller"
}

$Stage = Join-Path $env:TEMP "palmart-till-print-bridge-dev-stage"
New-Item -ItemType Directory -Force -Path $Stage | Out-Null
Copy-Item -Force $Bridge (Join-Path $Stage "till-print-bridge-windows.ps1")
Copy-Item -Force $Raw (Join-Path $Stage "windows-raw-print.ps1")
Copy-Item -Force $KitInstaller (Join-Path $Stage "Install-Palmart-Print-Bridge.ps1")
Copy-Item -Force (Join-Path $PSScriptRoot "start-till-print-bridge.cmd") (Join-Path $Stage "start-till-print-bridge.cmd") -ErrorAction SilentlyContinue
& (Join-Path $Stage "Install-Palmart-Print-Bridge.ps1")
exit $LASTEXITCODE
