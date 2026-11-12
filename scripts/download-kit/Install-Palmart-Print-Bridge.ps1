# Install Palmart Till Print Bridge once on Windows 10 / 11.
# ASCII-only. Starts powershell.exe directly (no VBScript / Node.js).
# Windows Script Host is often disabled on Win10, which left :19500 dead.
$ErrorActionPreference = "Stop"

$PkgDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$InstallDir = Join-Path $env:LOCALAPPDATA "Palmart\till-print-bridge"
$BridgeSrc = Join-Path $PkgDir "till-print-bridge-windows.ps1"
if (-not (Test-Path $BridgeSrc)) {
  $BridgeSrc = Join-Path $PkgDir "..\till-print-bridge-windows.ps1"
}
$BridgeDst = Join-Path $InstallDir "till-print-bridge-windows.ps1"
$HelperSrc = Join-Path $PkgDir "windows-raw-print.ps1"
if (-not (Test-Path $HelperSrc)) {
  $HelperSrc = Join-Path $PkgDir "..\windows-raw-print.ps1"
}
$HelperDst = Join-Path $InstallDir "windows-raw-print.ps1"
$LogPath = Join-Path $InstallDir "bridge.log"
$StartCmdPath = Join-Path $InstallDir "start-till-print-bridge.cmd"
$UninstallPath = Join-Path $InstallDir "Uninstall-Palmart-Print-Bridge.ps1"
$TaskName = "PalmartTillPrintBridge"
$StartupName = "Palmart-Till-Print-Bridge.cmd"
$Port = 19500
$ConfigPath = Join-Path $InstallDir "config.json"

# Tenant site. The one-file installer sets PALMART_ORIGIN from the page it was
# downloaded from; a plain zip install may ship an origin.txt next to this file.
$Origin = [string]$env:PALMART_ORIGIN
if (-not $Origin) {
  $originFile = Join-Path $PkgDir "origin.txt"
  if (Test-Path $originFile) {
    try { $Origin = ([string](Get-Content -LiteralPath $originFile -First 1)).Trim() } catch { }
  }
}
if ($Origin -and ($Origin -notmatch "^https?://[A-Za-z0-9\.\-]+(:\d+)?$")) { $Origin = "" }

function Write-Step([string]$Message) {
  Write-Host (" - " + $Message)
}

function Test-BridgeHealth {
  try {
    $client = New-Object System.Net.Sockets.TcpClient
    $iar = $client.BeginConnect("127.0.0.1", $Port, $null, $null)
    $ok = $iar.AsyncWaitHandle.WaitOne(1500, $false)
    if (-not $ok) {
      try { $client.Close() } catch { }
      return $false
    }
    $client.EndConnect($iar)
    $stream = $client.GetStream()
    $req = [System.Text.Encoding]::ASCII.GetBytes("GET /health HTTP/1.1`r`nHost: 127.0.0.1`r`nConnection: close`r`n`r`n")
    $stream.Write($req, 0, $req.Length)
    $stream.Flush()
    $buf = New-Object byte[] 2048
    Start-Sleep -Milliseconds 250
    $n = 0
    try { $n = $stream.Read($buf, 0, $buf.Length) } catch { $n = 0 }
    try { $client.Close() } catch { }
    if ($n -le 0) { return $false }
    $text = [System.Text.Encoding]::ASCII.GetString($buf, 0, $n)
    return [bool]($text -match '"ok"\s*:\s*true')
  } catch {
    return $false
  }
}

function Wait-BridgeHealth([int]$Attempts = 25) {
  for ($i = 0; $i -lt $Attempts; $i++) {
    if (Test-BridgeHealth) { return $true }
    Start-Sleep -Milliseconds 700
  }
  return $false
}

function Stop-OldBridge {
  try {
    $conns = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
    foreach ($c in $conns) {
      if ($c.OwningProcess -and $c.OwningProcess -gt 0) {
        Stop-Process -Id $c.OwningProcess -Force -ErrorAction SilentlyContinue
        Write-Step ("Stopped process on port " + $Port + " PID " + $c.OwningProcess)
      }
    }
  } catch { }

  try {
    $procs = Get-WmiObject Win32_Process -ErrorAction SilentlyContinue
    foreach ($p in @($procs)) {
      $cmd = [string]$p.CommandLine
      $name = [string]$p.Name
      if (-not $cmd) { continue }
      $hit = $false
      if ($cmd -match "till-print-bridge") { $hit = $true }
      if ($name -eq "node.exe" -and $cmd -match "till-print") { $hit = $true }
      if ($hit) {
        try {
          Stop-Process -Id $p.ProcessId -Force -ErrorAction SilentlyContinue
          Write-Step ("Stopped old bridge PID " + $p.ProcessId)
        } catch { }
      }
    }
  } catch { }
  Start-Sleep -Milliseconds 600
}

function Unblock-BridgeFiles([string]$Dir) {
  try {
    Get-ChildItem -LiteralPath $Dir -Filter "*.ps1" -ErrorAction SilentlyContinue | ForEach-Object {
      Unblock-File -LiteralPath $_.FullName -ErrorAction SilentlyContinue
    }
    Get-ChildItem -LiteralPath $Dir -Filter "*.cmd" -ErrorAction SilentlyContinue | ForEach-Object {
      Unblock-File -LiteralPath $_.FullName -ErrorAction SilentlyContinue
    }
  } catch { }
}

function Get-BridgeArgList([string]$BridgeFile, [bool]$Visible) {
  if ($Visible) {
    return ('-NoProfile -ExecutionPolicy Bypass -NoExit -File "' + $BridgeFile + '"')
  }
  return ('-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File "' + $BridgeFile + '"')
}

function Start-BridgeProcess([string]$PowerShellExe, [string]$BridgeFile, [string]$WorkDir, [bool]$Visible) {
  $env:TILL_PRINT_BRIDGE_LOG = $LogPath
  $argList = Get-BridgeArgList $BridgeFile $Visible
  $style = [System.Diagnostics.ProcessWindowStyle]::Hidden
  if ($Visible) { $style = [System.Diagnostics.ProcessWindowStyle]::Normal }
  Start-Process -FilePath $PowerShellExe -ArgumentList $argList -WorkingDirectory $WorkDir -WindowStyle $style | Out-Null
}

function Test-IsAdmin {
  try {
    $id = [Security.Principal.WindowsIdentity]::GetCurrent()
    $p = New-Object Security.Principal.WindowsPrincipal($id)
    return $p.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
  } catch { return $false }
}

# Chrome / Edge 142+ ask before a website may reach 127.0.0.1 ("Local network
# access"). These policy keys pre-grant it for the Palmart site so the cashier
# never sees the prompt. HKCU needs no admin; HKLM is added too when elevated.
function Add-PolicyUrlList([string]$KeyPath, [string[]]$Patterns) {
  if (-not (Test-Path $KeyPath)) { New-Item -Path $KeyPath -Force | Out-Null }
  $item = Get-ItemProperty -Path $KeyPath -ErrorAction SilentlyContinue
  $existing = @{}
  $max = 0
  if ($item) {
    foreach ($prop in $item.PSObject.Properties) {
      if ($prop.Name -match "^\d+$") {
        $existing[[string]$prop.Value] = $true
        $n = [int]$prop.Name
        if ($n -gt $max) { $max = $n }
      }
    }
  }
  foreach ($pat in $Patterns) {
    if ($existing.ContainsKey($pat)) { continue }
    $max++
    New-ItemProperty -Path $KeyPath -Name ([string]$max) -Value $pat -PropertyType String -Force | Out-Null
    $existing[$pat] = $true
  }
}

function Install-BrowserLocalNetworkPolicy([string[]]$Patterns) {
  $hives = @("HKCU:")
  if (Test-IsAdmin) { $hives += "HKLM:" }
  $browsers = @("SOFTWARE\Policies\Google\Chrome", "SOFTWARE\Policies\Microsoft\Edge")
  $policies = @("LocalNetworkAccessAllowedForUrls", "LoopbackNetworkAllowedForUrls")
  $done = 0
  foreach ($hive in $hives) {
    foreach ($b in $browsers) {
      foreach ($pol in $policies) {
        try {
          Add-PolicyUrlList ($hive + "\" + $b + "\" + $pol) $Patterns
          $done++
        } catch { }
      }
    }
  }
  return $done
}

function Get-LocalNetworkPatterns {
  $pats = @("[*.]kiosk.ke")
  if ($Origin) {
    $originHost = ""
    try { $originHost = ([Uri]$Origin).Host } catch { }
    if ($originHost -and ($originHost -notmatch "(^|\.)kiosk\.ke$")) {
      $pats += $Origin
      $pats += ("[*.]" + $originHost)
    }
  }
  return $pats
}

# Runs the bridge's own detection once (it also creates the Generic / Text
# queue for a bare USB Xprinter) and records the suggested queue so the
# cashier page can adopt it without a Detect click.
function Select-ReceiptPrinter([string]$PowerShellExe, [string]$BridgeFile) {
  $json = ""
  # Windows PowerShell 5.1 turns a child's stderr into a terminating error when
  # $ErrorActionPreference is Stop and the stream is redirected; relax it here.
  $ErrorActionPreference = "Continue"
  try {
    $json = & $PowerShellExe -NoProfile -ExecutionPolicy Bypass -File $BridgeFile -ListOnly 2>$null | Out-String
  } catch { $json = "" }
  # The bridge logs with Write-Host before printing the JSON; keep only the JSON.
  $idx = $json.LastIndexOf('{"ok":')
  if ($idx -ge 0) { $json = $json.Substring($idx) }
  $json = $json.Trim()
  if (-not $json) { return $null }
  $list = $null
  try { $list = $json | ConvertFrom-Json } catch { return $null }
  $name = [string]$list.suggested
  if (-not $name) { return $null }
  $now = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
  $safe = $name.Replace("\", "\\").Replace('"', '\"')
  $cfg = '{"printerName":"' + $safe + '","chosenBy":"installer","chosenAt":"' + $now + '"}'
  [System.IO.File]::WriteAllText($ConfigPath, $cfg, (New-Object System.Text.UTF8Encoding $false))
  return $name
}

function Install-StartupCmd([string]$SourceCmd) {
  $startupDir = [Environment]::GetFolderPath("Startup")
  if (-not $startupDir) { return $null }
  New-Item -ItemType Directory -Force -Path $startupDir | Out-Null
  $oldVbs = Join-Path $startupDir "Palmart-Till-Print-Bridge.vbs"
  Remove-Item -Force $oldVbs -ErrorAction SilentlyContinue
  $dest = Join-Path $startupDir $StartupName
  Copy-Item -Force $SourceCmd $dest
  return $dest
}

function Install-LogonTask([string]$PowerShellExe, [string]$BridgeFile, [string]$WorkDir) {
  $principal = New-ScheduledTaskPrincipal -UserId $env:USERNAME -LogonType Interactive -RunLevel Limited
  $argList = Get-BridgeArgList $BridgeFile $false
  $action = New-ScheduledTaskAction -Execute $PowerShellExe -Argument $argList -WorkingDirectory $WorkDir
  $trigger = New-ScheduledTaskTrigger -AtLogOn -User $env:USERNAME

  try {
    $settings = New-ScheduledTaskSettingsSet `
      -AllowStartIfOnBatteries `
      -DontStopIfGoingOnBatteries `
      -DontStopOnIdleEnd `
      -StartWhenAvailable `
      -ExecutionTimeLimit ([TimeSpan]::Zero) `
      -RestartCount 10 `
      -RestartInterval (New-TimeSpan -Minutes 1) `
      -MultipleInstances IgnoreNew
  } catch {
    $settings = New-ScheduledTaskSettingsSet `
      -AllowStartIfOnBatteries `
      -DontStopIfGoingOnBatteries `
      -StartWhenAvailable `
      -ExecutionTimeLimit ([TimeSpan]::Zero)
  }

  Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false -ErrorAction SilentlyContinue
  Register-ScheduledTask `
    -TaskName $TaskName `
    -Action $action `
    -Trigger $trigger `
    -Settings $settings `
    -Principal $principal `
    -Description "Palmart Till Print Bridge (127.0.0.1:19500) - powershell.exe, no VBS, no Node" `
    -Force | Out-Null

  try {
    Start-ScheduledTask -TaskName $TaskName -ErrorAction Stop
  } catch { }
}

if (-not (Test-Path $BridgeSrc)) {
  throw "Missing till-print-bridge-windows.ps1 next to this installer. Re-download the Windows zip."
}
if (-not (Test-Path $HelperSrc)) {
  throw "Missing windows-raw-print.ps1 next to this installer. Re-download the full Windows zip."
}

$psExe = Join-Path $env:SystemRoot "System32\WindowsPowerShell\v1.0\powershell.exe"
if (-not (Test-Path $psExe)) {
  $psExe = "powershell.exe"
}

Write-Host ""
Write-Host "=== Palmart Till Print Bridge - Windows 10 / 11 install ==="
Write-Step ("PowerShell: " + $psExe)
Write-Step ("Install dir: " + $InstallDir)
Write-Step "No Node.js. No VBScript."

New-Item -ItemType Directory -Force -Path $InstallDir | Out-Null
Copy-Item -Force $BridgeSrc $BridgeDst
Copy-Item -Force $HelperSrc $HelperDst
$VisibleSrc = Join-Path $PkgDir "Start-Bridge-Window.cmd"
if (Test-Path $VisibleSrc) {
  Copy-Item -Force $VisibleSrc (Join-Path $InstallDir "Start-Bridge-Window.cmd")
}
Unblock-BridgeFiles $PkgDir
Unblock-BridgeFiles $InstallDir

$policyPatterns = Get-LocalNetworkPatterns
$policyKeys = Install-BrowserLocalNetworkPolicy $policyPatterns
if ($policyKeys -gt 0) {
  Write-Step ("Browser local-network access pre-granted for: " + [string]::Join(", ", $policyPatterns))
} else {
  Write-Warning "Could not write browser policy. Chrome/Edge may ask once to allow local network access."
}

$startCmdLines = @(
  "@echo off",
  "REM Start the till print bridge (powershell.exe, no wscript).",
  'cd /d "%~dp0"',
  'set "TILL_PRINT_BRIDGE_LOG=%~dp0bridge.log"',
  'echo %DATE% %TIME% start-cmd >> "%TILL_PRINT_BRIDGE_LOG%"',
  'start "" /B "%SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe" -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File "%~dp0till-print-bridge-windows.ps1"',
  "echo Started Till Print Bridge.",
  "ping -n 3 127.0.0.1 >nul"
)
[System.IO.File]::WriteAllLines($StartCmdPath, $startCmdLines, [System.Text.Encoding]::ASCII)

$uninstallLines = @(
  '$ErrorActionPreference = "SilentlyContinue"',
  '$InstallDir = Split-Path -Parent $MyInvocation.MyCommand.Path',
  '$TaskName = "PalmartTillPrintBridge"',
  '$StartupDir = [Environment]::GetFolderPath("Startup")',
  'Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false',
  'Remove-Item -Force (Join-Path $StartupDir "Palmart-Till-Print-Bridge.cmd")',
  'Remove-Item -Force (Join-Path $StartupDir "Palmart-Till-Print-Bridge.vbs")',
  'Get-WmiObject Win32_Process | Where-Object { $_.CommandLine -match "till-print-bridge" } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }',
  'Write-Host "Stopped autostart. Remove folder to fully uninstall:" $InstallDir'
)
[System.IO.File]::WriteAllLines($UninstallPath, $uninstallLines, [System.Text.Encoding]::ASCII)

$startupPath = $null
try {
  $startupPath = Install-StartupCmd -SourceCmd $StartCmdPath
  if ($startupPath) { Write-Step ("Startup folder: " + $startupPath) }
} catch {
  Write-Warning ("Could not add Startup folder entry: " + $_.Exception.Message)
}

$taskOk = $false
try {
  Install-LogonTask -PowerShellExe $psExe -BridgeFile $BridgeDst -WorkDir $InstallDir
  $taskOk = $true
  Write-Step ("Scheduled task: " + $TaskName + " (powershell.exe at logon)")
} catch {
  Write-Warning ("Scheduled task not registered (Startup folder still used): " + $_.Exception.Message)
}

Stop-OldBridge
Start-BridgeProcess -PowerShellExe $psExe -BridgeFile $BridgeDst -WorkDir $InstallDir -Visible $false
Write-Step "Started powershell.exe hidden (no wscript)"

$ok = Wait-BridgeHealth
if (-not $ok) {
  Write-Warning "Hidden start did not listen yet. Starting a visible window..."
  Start-BridgeProcess -PowerShellExe $psExe -BridgeFile $BridgeDst -WorkDir $InstallDir -Visible $true
  $ok = Wait-BridgeHealth
}

Write-Host ""
if ($ok) {
  Write-Host "OK - running at http://127.0.0.1:19500"
  Write-Step "printEngine=v5-bypass-epson (PowerShell, no Node.js)"
  Write-Step "Looking for the receipt printer..."
  $picked = $null
  try { $picked = Select-ReceiptPrinter -PowerShellExe $psExe -BridgeFile $BridgeDst } catch { }
  if ($picked) {
    Write-Host ("Receipt printer: " + $picked)
  } else {
    Write-Warning "No receipt printer found yet. Plug it in and switch it on, then use Detect printers in Cashier."
  }
  Write-Host "It starts automatically when you sign in. You do NOT need to keep a window open."
  if ($taskOk) {
    Write-Host ("Autostart: Startup folder + Task Scheduler (" + $TaskName + ")")
  } else {
    Write-Host "Autostart: Startup folder"
  }
  Write-Host ("Logs: " + $LogPath)
  Write-Host ("To remove autostart later: " + $UninstallPath)
  Write-Host ""
  if ($Origin) {
    $cashierUrl = $Origin.TrimEnd("/") + "/cashier"
    Write-Host ("Opening " + $cashierUrl)
    try { Start-Process $cashierUrl | Out-Null } catch { }
  } else {
    Write-Host "Now open Palmart Cashier on this PC."
  }
  if (-not $picked) { Write-Host "In Cashier open Printer -> Detect printers." }
  exit 0
}

Write-Warning "Files installed, but nothing is listening on 127.0.0.1:19500"
Write-Warning ("Log file: " + $LogPath)
if (Test-Path $LogPath) {
  Write-Host "---- last log lines ----"
  try { Get-Content -LiteralPath $LogPath -Tail 30 } catch { }
  Write-Host "------------------------"
}
Write-Warning ("Try double-click: " + $StartCmdPath)
Write-Warning "Or run Start-Bridge-Window.cmd from the unzipped folder (keep that window open)."
throw "Bridge did not become healthy on http://127.0.0.1:19500"
