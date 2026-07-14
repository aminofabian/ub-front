# Install Palmart Till Print Bridge from an extracted Windows download package.
$ErrorActionPreference = "Stop"

$PkgDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$InstallDir = Join-Path $env:LOCALAPPDATA "Palmart\till-print-bridge"
$BridgeSrc = Join-Path $PkgDir "till-print-bridge.mjs"
$BridgeDst = Join-Path $InstallDir "till-print-bridge.mjs"
$TaskName = "PalmartTillPrintBridge"

$NodeCmd = Get-Command node -ErrorAction SilentlyContinue
if (-not $NodeCmd) {
  throw "node not found in PATH. Install Node.js from https://nodejs.org/ then re-run."
}
$Node = $NodeCmd.Source

if (-not (Test-Path $BridgeSrc)) {
  throw "Missing till-print-bridge.mjs next to this installer."
}

New-Item -ItemType Directory -Force -Path $InstallDir | Out-Null
Copy-Item -Force $BridgeSrc $BridgeDst

# Flat install layout: bridge + launcher side by side (not frontend/scripts/...).
$StartCmd = Join-Path $InstallDir "start-till-print-bridge.cmd"
$StartCmdSrc = Join-Path $PkgDir "start-till-print-bridge.cmd"
if (Test-Path $StartCmdSrc) {
  Copy-Item -Force $StartCmdSrc $StartCmd
} else {
  @(
    "@echo off",
    "cd /d `"%~dp0`"",
    "echo Starting Till Print Bridge for Palmart cloud cashier...",
    "echo Leave this window open while cashiering. Press Ctrl+C to stop.",
    "where node >nul 2>&1",
    "if errorlevel 1 (",
    "  echo node not found in PATH. Install Node.js from https://nodejs.org/",
    "  pause",
    "  exit /b 1",
    ")",
    "node `"%~dp0till-print-bridge.mjs`"",
    "pause"
  ) | Set-Content -Path $StartCmd -Encoding ASCII
}

$Action = New-ScheduledTaskAction -Execute $Node -Argument "`"$BridgeDst`"" -WorkingDirectory $InstallDir
$Trigger = New-ScheduledTaskTrigger -AtLogOn -User $env:USERNAME
$Settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 1)

Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false -ErrorAction SilentlyContinue
Register-ScheduledTask -TaskName $TaskName -Action $Action -Trigger $Trigger -Settings $Settings -Description "Palmart Till Print Bridge (127.0.0.1:19500)" | Out-Null
Start-ScheduledTask -TaskName $TaskName

Start-Sleep -Seconds 1
try {
  $health = Invoke-RestMethod -Uri "http://127.0.0.1:19500/health" -TimeoutSec 3
  Write-Host "Installed and running at http://127.0.0.1:19500 (platform=$($health.platform))"
  Write-Host "It will start automatically at logon for $env:USERNAME."
} catch {
  Write-Warning "Installed, but health check failed. Start manually: $InstallDir\start-till-print-bridge.cmd"
  throw
}
