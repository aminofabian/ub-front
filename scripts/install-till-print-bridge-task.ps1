# Install Till Print Bridge as a Windows logon Task Scheduler job.
# Run once in PowerShell (as the till user):
#   Set-ExecutionPolicy -Scope Process Bypass
#   .\scripts\install-till-print-bridge-task.ps1

$ErrorActionPreference = "Stop"

$FrontendDir = Split-Path -Parent $PSScriptRoot
if (-not (Test-Path (Join-Path $FrontendDir "scripts\till-print-bridge.mjs"))) {
  $FrontendDir = Split-Path -Parent $MyInvocation.MyCommand.Path
  $FrontendDir = Split-Path -Parent $FrontendDir
}

$NodeCmd = Get-Command node -ErrorAction SilentlyContinue
if (-not $NodeCmd) {
  throw "node not found in PATH. Install Node.js first."
}
$Node = $NodeCmd.Source

$Bridge = Join-Path $FrontendDir "scripts\till-print-bridge.mjs"
if (-not (Test-Path $Bridge)) {
  throw "Missing $Bridge"
}

$TaskName = "PalmartTillPrintBridge"
$Action = New-ScheduledTaskAction -Execute $Node -Argument "`"$Bridge`"" -WorkingDirectory $FrontendDir
$Trigger = New-ScheduledTaskTrigger -AtLogOn -User $env:USERNAME
$Settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 1)

Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false -ErrorAction SilentlyContinue
Register-ScheduledTask -TaskName $TaskName -Action $Action -Trigger $Trigger -Settings $Settings -Description "Palmart Till Print Bridge (127.0.0.1:19500)" | Out-Null
Start-ScheduledTask -TaskName $TaskName

Start-Sleep -Seconds 1
try {
  $health = Invoke-RestMethod -Uri "http://127.0.0.1:19500/health" -TimeoutSec 3
  Write-Host "Till Print Bridge is running on http://127.0.0.1:19500 (platform=$($health.platform))"
  Write-Host "It will start at every logon for $env:USERNAME."
} catch {
  Write-Warning "Installed, but health check failed. Start manually: scripts\start-till-print-bridge.cmd"
  throw
}
