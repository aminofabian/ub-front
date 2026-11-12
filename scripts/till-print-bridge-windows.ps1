# Palmart Till Print Bridge for Windows 10 / 11 (PowerShell + .NET - no Node.js).
# ASCII-only. Same HTTP API as the Win7 / Node bridges: http://127.0.0.1:19500
# Uses TcpListener so no netsh URL ACL / admin is required.
#
# On Detect (/printers) this reads USB Printing Support ports (including the USB
# Monitor key Windows 11 fills before any queue exists) and COM receipt devices,
# then tries to add a Generic / Text Only queue. The port is still listed when
# the driver cannot be installed without administrator.
param(
  [switch]$ListOnly
)

$ErrorActionPreference = "Continue"
$ProgressPreference = "SilentlyContinue"
$WarningPreference = "SilentlyContinue"
$Port = 19500
$ScriptDir = $PSScriptRoot
if (-not $ScriptDir) {
  try { $ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path } catch { }
}
if (-not $ScriptDir) { $ScriptDir = [string](Get-Location).Path }
$LogFile = $env:TILL_PRINT_BRIDGE_LOG
if (-not $LogFile) {
  $LogFile = Join-Path $ScriptDir "bridge.log"
}
$script:PnpDeviceCache = $null

function Write-BridgeLog([string]$Message) {
  $line = (Get-Date -Format "yyyy-MM-ddTHH:mm:ss") + " " + $Message
  try { Write-Host $line } catch { }
  try { Add-Content -Path $LogFile -Value $line -ErrorAction SilentlyContinue } catch { }
}

function Escape-Json([string]$s) {
  if ($null -eq $s) { return "" }
  $t = [string]$s
  $t = $t.Replace("\", "\\")
  $t = $t.Replace('"', '\"')
  $t = $t.Replace("`r", "\r")
  $t = $t.Replace("`n", "\n")
  $t = $t.Replace("`t", "\t")
  return $t
}

function Test-NoisePrinter([string]$Name, [string]$PortName) {
  $blob = ($Name + " " + $PortName).ToLower()
  return [bool]($blob -match "fax|onenote|microsoft print to pdf|microsoft xps|adobe pdf|cutepdf|pdf creator|virtual printer")
}

function Test-LikelyThermal([string]$Name, [string]$PortName) {
  $blob = ($Name + " " + $PortName).ToLower()
  if (Test-NoisePrinter $Name $PortName) { return $false }
  if ($blob -match "caysn|xprinter|x-printer|epson|tm-|star|bixolon|citizen|pos.?80|pos80|receipt|thermal|rongta|gprinter|munbyn|rp58|rp80|xp-?\d+|usb.?print|generic.?/?\s*text|palmart") {
    return $true
  }
  if ($PortName -match "^(USB|COM|DOT4|ESDPRT|TMUSB)") { return $true }
  return $false
}

function Test-LikelyReceiptPnp([string]$Name) {
  if (-not $Name) { return $false }
  return [bool]($Name -match "USB Printing|POS-?80|POS80|Xprinter|X-Printer|XP-?\d+|Thermal|Receipt|Gprinter|Rongta|Caysn|Munbyn|CH340|CH341|CP210|USB.?Serial|USB-to-Serial|USB to Serial|Printer")
}

function Normalize-PortName([string]$Name) {
  if (-not $Name) { return "" }
  $n = ([string]$Name).Trim().TrimEnd(":")
  if (-not $n) { return "" }
  if ($n -match "^(PSChildName|PSDrive|PSProvider|PSPath|PSParentPath|PSComputerName)$") { return "" }
  if ($n -match "^(PS|Computer|Path|Provider)") { return "" }
  if ($n -match "^(USB|COM|LPT)\d+$") { return $n.ToUpper() }
  if ($n -match "^(DOT4|ESDPRT|TMUSB|USBPRINT)[_\-]?\d+$") { return $n.ToUpper() }
  return $n
}

function Test-UsbClassPort([string]$Name) {
  $n = Normalize-PortName $Name
  if (-not $n) { return $false }
  if ($n -match "^USB\d+$") { return $true }
  if ($n -match "^(DOT4|ESDPRT|TMUSB|USBPRINT)[_\-]?\d+$") { return $true }
  return $false
}

function Add-PortName($Ports, [string]$Name) {
  $n = Normalize-PortName $Name
  if (-not $n) { return }
  if (-not (Test-UsbClassPort $n)) { return }
  if (-not $Ports.Contains($n)) { [void]$Ports.Add($n) }
}

function Ensure-PrintSpooler {
  try {
    $sp = Get-Service -Name Spooler -ErrorAction SilentlyContinue
    if ($sp -and $sp.Status -ne "Running") {
      Start-Service -Name Spooler -ErrorAction SilentlyContinue
      Start-Sleep -Seconds 2
      Write-BridgeLog "Started Print Spooler"
    }
  } catch { }
}

function Get-GenericTextDriverName {
  try {
    foreach ($d in @(Get-PrinterDriver -ErrorAction SilentlyContinue)) {
      $n = [string]$d.Name
      if ($n -match "Generic.*Text") { return $n }
    }
  } catch { }
  $inf = Join-Path $env:SystemRoot "inf\ntprint.inf"
  try {
    if (Test-Path $inf) {
      Add-PrinterDriver -Name "Generic / Text Only" -InfPath $inf -ErrorAction SilentlyContinue
    } else {
      Add-PrinterDriver -Name "Generic / Text Only" -ErrorAction SilentlyContinue
    }
  } catch { }
  return "Generic / Text Only"
}

function Add-PortsFromPrintKey($Ports, [string]$RegPath) {
  if (-not (Test-Path -LiteralPath $RegPath)) { return }
  try {
    $key = Get-Item -LiteralPath $RegPath -ErrorAction SilentlyContinue
    if ($key) {
      foreach ($valueName in @($key.GetValueNames())) {
        Add-PortName $Ports ([string]$valueName)
        try {
          $raw = $key.GetValue($valueName)
          if ($null -ne $raw) { Add-PortName $Ports ([string]$raw) }
        } catch { }
      }
    }
  } catch { }
  try {
    foreach ($child in @(Get-ChildItem -LiteralPath $RegPath -ErrorAction SilentlyContinue)) {
      Add-PortName $Ports ([string]$child.PSChildName)
      try {
        foreach ($valueName in @($child.GetValueNames())) {
          Add-PortName $Ports ([string]$valueName)
          $raw = $child.GetValue($valueName)
          if ($null -ne $raw) { Add-PortName $Ports ([string]$raw) }
        }
      } catch { }
    }
  } catch { }
}

function Add-PortsFromUsbPrintEnum($Ports) {
  $root = "HKLM:\SYSTEM\CurrentControlSet\Enum\USBPRINT"
  if (-not (Test-Path -LiteralPath $root)) { return }
  try {
    foreach ($dev in @(Get-ChildItem -LiteralPath $root -Recurse -ErrorAction SilentlyContinue)) {
      foreach ($propName in @("PortName", "Port")) {
        try {
          $raw = $dev.GetValue($propName)
          if ($null -ne $raw) { Add-PortName $Ports ([string]$raw) }
        } catch { }
      }
    }
  } catch { }
}

function Get-PnpLabel($Device) {
  $n = [string]$Device.FriendlyName
  if (-not $n) { $n = [string]$Device.Name }
  if (-not $n) { $n = [string]$Device.Description }
  return $n
}

function Get-PnpDevicesAny {
  if ($script:PnpDeviceCache) { return @($script:PnpDeviceCache) }
  $devs = @()
  try { $devs = @(Get-PnpDevice -ErrorAction SilentlyContinue) } catch { $devs = @() }
  if ($devs.Count -eq 0) {
    try { $devs = @(Get-WmiObject Win32_PnPEntity -ErrorAction SilentlyContinue) } catch { $devs = @() }
  }
  $script:PnpDeviceCache = $devs
  return @($devs)
}

function Test-UsbPrintDevice($Device) {
  $n = Get-PnpLabel $Device
  $id = [string]$Device.InstanceId
  if (-not $id) { $id = [string]$Device.DeviceID }
  $svc = [string]$Device.Service
  if ($id -like "USBPRINT*") { return $true }
  if ($svc -eq "usbprint") { return $true }
  if ($n -match "USB Printing Support") { return $true }
  return $false
}

function Test-PnpPresent($Device) {
  $st = [string]$Device.Status
  if (-not $st) { return $true }
  return [bool]($st -eq "OK")
}

function Get-LiveComPorts {
  $live = @{}
  try {
    foreach ($c in [System.IO.Ports.SerialPort]::GetPortNames()) {
      $n = Normalize-PortName ([string]$c)
      if ($n -match "^COM\d+$") { $live[$n] = $true }
    }
  } catch { }
  try {
    foreach ($s in @(Get-WmiObject Win32_SerialPort -ErrorAction SilentlyContinue)) {
      $n = Normalize-PortName ([string]$s.DeviceID)
      if ($n -match "^COM\d+$") { $live[$n] = $true }
    }
  } catch { }
  return $live
}

function Get-UsbPrintPorts {
  $ports = New-Object System.Collections.ArrayList

  # CurrentVersion\Ports only gains USB001 after a queue exists. The USB Monitor
  # key is where Windows 11 records the port as soon as USB Printing Support binds.
  Add-PortsFromPrintKey $ports "HKLM:\SYSTEM\CurrentControlSet\Control\Print\Monitors\USB Monitor\Ports"
  Add-PortsFromPrintKey $ports "HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Ports"
  Add-PortsFromUsbPrintEnum $ports

  try {
    foreach ($p in @(Get-PrinterPort -ErrorAction SilentlyContinue)) {
      Add-PortName $ports ([string]$p.Name)
    }
  } catch { }

  return @($ports)
}

function Get-ReceiptComPortsFromPnp {
  $found = New-Object System.Collections.ArrayList
  $live = Get-LiveComPorts
  foreach ($d in @(Get-PnpDevicesAny)) {
    $n = Get-PnpLabel $d
    if (-not (Test-LikelyReceiptPnp $n)) { continue }
    if ($n -match "\((COM\d+)\)") {
      $com = Normalize-PortName $Matches[1]
      if (-not $com) { continue }
      $present = Test-PnpPresent $d
      if (-not $present -and -not $live.ContainsKey($com)) { continue }
      if (-not $found.Contains($com)) { [void]$found.Add($com) }
    }
  }
  try {
    foreach ($s in @(Get-WmiObject Win32_SerialPort -ErrorAction SilentlyContinue)) {
      $n = [string]$s.Name
      if (-not (Test-LikelyReceiptPnp $n)) { continue }
      $com = Normalize-PortName ([string]$s.DeviceID)
      if ($com -match "^COM\d+$" -and -not $found.Contains($com)) {
        [void]$found.Add($com)
      }
    }
  } catch { }
  return @($found)
}

function Get-UsedPrinterPorts {
  $used = @{}
  try {
    foreach ($p in @(Get-WmiObject -Class Win32_Printer -ErrorAction SilentlyContinue)) {
      $pn = Normalize-PortName ([string]$p.PortName)
      if ($pn) { $used[$pn] = $true }
    }
  } catch { }
  try {
    foreach ($p in @(Get-Printer -ErrorAction SilentlyContinue)) {
      $pn = Normalize-PortName ([string]$p.PortName)
      if ($pn) { $used[$pn] = $true }
    }
  } catch { }
  return $used
}

function Get-UniqueQueueName([string]$Preferred, $ExistingNames) {
  if (-not $ExistingNames.ContainsKey($Preferred)) { return $Preferred }
  $i = 2
  while ($ExistingNames.ContainsKey($Preferred + " " + $i)) { $i++ }
  return ($Preferred + " " + $i)
}

function Add-GenericTextQueue([string]$Name, [string]$Port) {
  $driver = Get-GenericTextDriverName
  $portName = Normalize-PortName $Port
  if (-not $portName) { $portName = $Port }
  $lastError = ""
  $tryPorts = @($portName)
  if ($portName -notmatch ":$") { $tryPorts += ($portName + ":") }
  foreach ($tryPort in $tryPorts) {
    try {
      Add-Printer -Name $Name -DriverName $driver -PortName $tryPort -ErrorAction Stop
      Write-BridgeLog ("Added queue '" + $Name + "' driver='" + $driver + "' port=" + $tryPort)
      return $true
    } catch {
      $lastError = $_.Exception.Message
    }
  }
  if ($lastError) {
    Write-BridgeLog ("Add-Printer failed for '" + $Name + "' on " + $portName + ": " + $lastError)
  }
  try {
    $inf = Join-Path $env:SystemRoot "inf\ntprint.inf"
    $argLine = "printui.dll,PrintUIEntry /if /b `"" + $Name + "`" /f `"" + $inf + "`" /r `"" + $portName + "`" /m `"Generic / Text Only`""
    $psi = New-Object System.Diagnostics.ProcessStartInfo
    $psi.FileName = "rundll32.exe"
    $psi.Arguments = $argLine
    $psi.UseShellExecute = $false
    $psi.CreateNoWindow = $true
    $p = [System.Diagnostics.Process]::Start($psi)
    if ($p) { [void]$p.WaitForExit(15000) }
    Start-Sleep -Milliseconds 600
    $safe = $Name -replace "'", "''"
    $check = Get-WmiObject Win32_Printer -Filter ("Name='" + $safe + "'") -ErrorAction SilentlyContinue
    if ($check) {
      Write-BridgeLog ("Added queue via printui '" + $Name + "' port=" + $portName)
      return $true
    }
  } catch {
    Write-BridgeLog ("printui failed for '" + $Name + "' on " + $portName + ": " + $_.Exception.Message)
  }
  Write-BridgeLog ("Could not add queue '" + $Name + "' on " + $portName + " (will still list the port)")
  return $false
}

function Ensure-UsbReceiptQueues {
  try {
  Ensure-PrintSpooler
  $script:PnpDeviceCache = $null
  $used = Get-UsedPrinterPorts
  $existingNames = @{}
  try {
    foreach ($p in @(Get-WmiObject -Class Win32_Printer -ErrorAction SilentlyContinue)) {
      $n = [string]$p.Name
      if ($n) { $existingNames[$n] = $true }
    }
  } catch { }

  $usbPorts = @(Get-UsbPrintPorts)
  $comPorts = @(Get-ReceiptComPortsFromPnp)
  $usbJoined = ""
  if ($usbPorts.Count -gt 0) { $usbJoined = [string]::Join(",", $usbPorts) }
  $comJoined = ""
  if ($comPorts.Count -gt 0) { $comJoined = [string]::Join(",", $comPorts) }
  Write-BridgeLog ("Receipt ports usb=[" + $usbJoined + "] com=[" + $comJoined + "]")
  $usbDevice = $false
  foreach ($d in @(Get-PnpDevicesAny)) {
    if (Test-UsbPrintDevice $d) { $usbDevice = $true; break }
  }
  if ($usbPorts.Count -eq 0 -and $usbDevice) {
    Write-BridgeLog "USB Printing Support is connected but Windows has not registered a USB00n port yet. Unplug the printer, wait two seconds, plug it back in, then Detect again."
  }

  $targets = New-Object System.Collections.ArrayList

  foreach ($port in $usbPorts) {
    $port = Normalize-PortName $port
    if (-not $port) { continue }
    if ($used.ContainsKey($port)) { continue }
    if (-not (Test-UsbClassPort $port)) { continue }
    [void]$targets.Add($port)
  }

  foreach ($com in $comPorts) {
    $com = Normalize-PortName $com
    if (-not $com) { continue }
    if ($used.ContainsKey($com)) { continue }
    if (-not $targets.Contains($com)) { [void]$targets.Add($com) }
  }

  foreach ($port in $targets) {
    $preferred = "Xprinter"
    if ($port -ne "USB001") { $preferred = "Xprinter (" + $port + ")" }
    $name = Get-UniqueQueueName $preferred $existingNames
    if (Add-GenericTextQueue $name $port) {
      $existingNames[$name] = $true
      $used[$port] = $true
    }
  }
  } catch {
    Write-BridgeLog ("Ensure USB queues: " + $_.Exception.Message)
  }
}

function New-PrinterRow([string]$Name, [string]$PortName, [string]$Driver, [bool]$IsDefault) {
  return New-Object PSObject -Property @{
    Name = $Name
    PortName = $PortName
    DriverName = $Driver
    Default = $IsDefault
    LikelyThermal = (Test-LikelyThermal $Name $PortName)
  }
}

function Get-PrinterRows {
  Ensure-UsbReceiptQueues
  $byName = @{}

  try {
    foreach ($p in @(Get-WmiObject -Class Win32_Printer -ErrorAction SilentlyContinue)) {
      $name = [string]$p.Name
      if (-not $name) { continue }
      $portName = [string]$p.PortName
      $driver = [string]$p.DriverName
      $isDefault = $false
      try { $isDefault = [bool]$p.Default } catch { }
      $byName[$name] = New-PrinterRow $name $portName $driver $isDefault
    }
  } catch { }

  try {
    foreach ($p in @(Get-CimInstance -ClassName Win32_Printer -ErrorAction SilentlyContinue)) {
      $name = [string]$p.Name
      if (-not $name) { continue }
      if ($byName.ContainsKey($name)) { continue }
      $portName = [string]$p.PortName
      $driver = [string]$p.DriverName
      $isDefault = $false
      try { $isDefault = [bool]$p.Default } catch { }
      $byName[$name] = New-PrinterRow $name $portName $driver $isDefault
    }
  } catch { }

  try {
    foreach ($p in @(Get-Printer -ErrorAction SilentlyContinue)) {
      $name = [string]$p.Name
      if (-not $name) { continue }
      if ($byName.ContainsKey($name)) { continue }
      $portName = [string]$p.PortName
      $driver = [string]$p.DriverName
      $byName[$name] = New-PrinterRow $name $portName $driver $false
    }
  } catch { }

  $usedPorts = @{}
  foreach ($row in $byName.Values) {
    $pn = Normalize-PortName ([string]$row.PortName)
    if ($pn) { $usedPorts[$pn] = $true }
  }
  foreach ($port in @(Get-UsbPrintPorts)) {
    $port = Normalize-PortName $port
    if (-not $port) { continue }
    if ($usedPorts.ContainsKey($port)) { continue }
    if (-not (Test-UsbClassPort $port)) { continue }
    if (-not $byName.ContainsKey($port)) {
      $byName[$port] = New-PrinterRow $port $port "port" $false
    }
  }
  foreach ($com in @(Get-ReceiptComPortsFromPnp)) {
    $com = Normalize-PortName $com
    if (-not $com) { continue }
    if ($usedPorts.ContainsKey($com)) { continue }
    if (-not $byName.ContainsKey($com)) {
      $byName[$com] = New-PrinterRow $com $com "port" $false
    }
  }

  $rows = @()
  foreach ($row in $byName.Values) { $rows += $row }
  return $rows
}

function Convert-PrintersToJson($rows) {
  $suggested = $null
  $defaultName = $null
  foreach ($r in $rows) {
    if ($r.Default) { $defaultName = $r.Name }
  }
  foreach ($r in $rows) {
    if ($r.LikelyThermal) { $suggested = $r.Name; break }
  }
  if (-not $suggested) {
    foreach ($r in $rows) {
      if (-not (Test-NoisePrinter $r.Name $r.PortName) -and $r.Default) {
        $suggested = $r.Name
        break
      }
    }
  }
  if (-not $suggested) {
    foreach ($r in $rows) {
      if (-not (Test-NoisePrinter $r.Name $r.PortName)) {
        $suggested = $r.Name
        break
      }
    }
  }
  if (-not $suggested -and $rows.Count -eq 1) {
    $suggested = $rows[0].Name
  }

  $parts = @()
  foreach ($r in $rows) {
    $lt = "false"
    if ($r.LikelyThermal) { $lt = "true" }
    $def = "false"
    if ($r.Default) { $def = "true" }
    $uri = Escape-Json $r.PortName
    $nm = Escape-Json $r.Name
    $parts += ('{"name":"' + $nm + '","uri":"' + $uri + '","isDefault":' + $def + ',"likelyThermal":' + $lt + '}')
  }
  $arr = "[" + ([string]::Join(",", $parts)) + "]"
  $sugJson = "null"
  if ($suggested) { $sugJson = '"' + (Escape-Json $suggested) + '"' }
  $defJson = "null"
  if ($defaultName) { $defJson = '"' + (Escape-Json $defaultName) + '"' }
  return ('{"ok":true,"platform":"win32","printers":' + $arr + ',"suggested":' + $sugJson + ',"defaultName":' + $defJson + '}')
}

function Send-WindowsRaw([string]$PrinterName, [byte[]]$Bytes) {
  $base = $ScriptDir
  if (-not $base) { $base = [string](Get-Location).Path }
  $helper = Join-Path $base "windows-raw-print.ps1"
  if (-not (Test-Path -LiteralPath $helper)) {
    throw ("Missing windows-raw-print.ps1 next to the bridge (" + $helper + "). Re-run Install-Palmart-Print-Bridge.cmd.")
  }
  if ([string]::IsNullOrEmpty($PrinterName)) {
    throw "PrinterName is empty."
  }
  $tempRoot = [System.IO.Path]::GetTempPath()
  if (-not $tempRoot) { $tempRoot = $base }
  $tmp = [System.IO.Path]::Combine($tempRoot, ("palmart-escpos-" + [Guid]::NewGuid().ToString("n") + ".bin"))
  [System.IO.File]::WriteAllBytes($tmp, $Bytes)
  try {
    & $helper -PrinterName $PrinterName -FilePath $tmp
  } finally {
    if ($tmp) { Remove-Item -LiteralPath $tmp -Force -ErrorAction SilentlyContinue }
  }
}

function Send-NetworkRaw([string]$HostName, [int]$PortNumber, [byte[]]$Bytes) {
  $client = New-Object System.Net.Sockets.TcpClient
  try {
    $iar = $client.BeginConnect($HostName, $PortNumber, $null, $null)
    $ok = $iar.AsyncWaitHandle.WaitOne(8000, $false)
    if (-not $ok) { throw "Timed out connecting to $HostName`:$PortNumber" }
    $client.EndConnect($iar)
    $stream = $client.GetStream()
    $stream.Write($Bytes, 0, $Bytes.Length)
    $stream.Flush()
    if ($Bytes.Length -lt 128) { Start-Sleep -Milliseconds 200 }
  } finally {
    try { $client.Close() } catch { }
  }
}

function Get-HeaderValue($Headers, [string]$Name) {
  foreach ($key in $Headers.Keys) {
    if ([string]::Compare([string]$key, $Name, $true) -eq 0) {
      return [string]$Headers[$key]
    }
  }
  return ""
}

function Read-HttpRequest($Stream) {
  $ms = New-Object System.IO.MemoryStream
  $buf = New-Object byte[] 4096
  $headerText = ""
  $bodyStart = -1

  while ($true) {
    $n = $Stream.Read($buf, 0, $buf.Length)
    if ($n -le 0) { break }
    $ms.Write($buf, 0, $n)
    $headerText = [System.Text.Encoding]::ASCII.GetString($ms.ToArray())
    $idx = $headerText.IndexOf("`r`n`r`n")
    if ($idx -ge 0) {
      $bodyStart = $idx + 4
      break
    }
    if ($ms.Length -gt 65536) { throw "HTTP headers too large" }
  }

  if ($bodyStart -lt 0) { throw "Incomplete HTTP request" }

  $all = $ms.ToArray()
  $headerBytes = $bodyStart
  $headerStr = [System.Text.Encoding]::ASCII.GetString($all, 0, $headerBytes)
  $lines = $headerStr.Split([string[]]@("`r`n"), [StringSplitOptions]::None)
  if ($lines.Length -lt 1) { throw "Empty HTTP request" }

  $parts = $lines[0].Split(" ")
  if ($parts.Length -lt 2) { throw "Bad HTTP request line" }
  $method = $parts[0].ToUpper()
  $path = $parts[1]
  $q = $path.IndexOf("?")
  if ($q -ge 0) { $path = $path.Substring(0, $q) }
  $path = $path.TrimEnd("/")
  if (-not $path) { $path = "/" }

  $headers = @{}
  for ($i = 1; $i -lt $lines.Length; $i++) {
    $line = $lines[$i]
    if (-not $line) { continue }
    $colon = $line.IndexOf(":")
    if ($colon -lt 1) { continue }
    $hk = $line.Substring(0, $colon).Trim()
    $hv = $line.Substring($colon + 1).Trim()
    $headers[$hk] = $hv
  }

  $contentLength = 0
  $cl = Get-HeaderValue $headers "Content-Length"
  if ($cl) {
    try { $contentLength = [int]$cl } catch { $contentLength = 0 }
  }

  $body = New-Object byte[] 0
  if ($contentLength -gt 0) {
    $have = $all.Length - $bodyStart
    $bodyMs = New-Object System.IO.MemoryStream
    if ($have -gt 0) {
      $bodyMs.Write($all, $bodyStart, [Math]::Min($have, $contentLength))
    }
    while ($bodyMs.Length -lt $contentLength) {
      $need = $contentLength - [int]$bodyMs.Length
      $chunk = New-Object byte[] ([Math]::Min(4096, $need))
      $rn = $Stream.Read($chunk, 0, $chunk.Length)
      if ($rn -le 0) { break }
      $bodyMs.Write($chunk, 0, $rn)
    }
    $body = $bodyMs.ToArray()
  }

  return @{
    Method = $method
    Path = $path
    Headers = $headers
    Body = $body
  }
}

function Write-HttpResponse($Stream, [int]$StatusCode, [string]$Body, [string]$ContentType) {
  if (-not $ContentType) { $ContentType = "text/plain" }
  $reason = "OK"
  if ($StatusCode -eq 204) { $reason = "No Content" }
  elseif ($StatusCode -eq 400) { $reason = "Bad Request" }
  elseif ($StatusCode -eq 404) { $reason = "Not Found" }
  elseif ($StatusCode -eq 413) { $reason = "Payload Too Large" }
  elseif ($StatusCode -eq 500) { $reason = "Internal Server Error" }
  elseif ($StatusCode -eq 502) { $reason = "Bad Gateway" }

  $bodyBytes = [System.Text.Encoding]::UTF8.GetBytes($Body)
  $sb = New-Object System.Text.StringBuilder
  [void]$sb.Append("HTTP/1.1 $StatusCode $reason`r`n")
  [void]$sb.Append("Access-Control-Allow-Origin: *`r`n")
  [void]$sb.Append("Access-Control-Allow-Methods: GET, POST, OPTIONS`r`n")
  [void]$sb.Append("Access-Control-Allow-Headers: Content-Type, X-Printer-Cups-Name, X-Printer-Host, X-Printer-Port`r`n")
  [void]$sb.Append("Access-Control-Allow-Private-Network: true`r`n")
  [void]$sb.Append("Access-Control-Max-Age: 86400`r`n")
  [void]$sb.Append("Content-Type: $ContentType`r`n")
  [void]$sb.Append("Content-Length: $($bodyBytes.Length)`r`n")
  [void]$sb.Append("Connection: close`r`n")
  [void]$sb.Append("`r`n")
  $headerBytes = [System.Text.Encoding]::ASCII.GetBytes($sb.ToString())
  $Stream.Write($headerBytes, 0, $headerBytes.Length)
  if ($bodyBytes.Length -gt 0) {
    $Stream.Write($bodyBytes, 0, $bodyBytes.Length)
  }
  $Stream.Flush()
}

function Get-ConfiguredPrinterJson {
  try {
    $cfg = Join-Path $ScriptDir "config.json"
    if (-not (Test-Path -LiteralPath $cfg)) { return "null" }
    $obj = (Get-Content -LiteralPath $cfg -Raw) | ConvertFrom-Json
    $n = [string]$obj.printerName
    if (-not $n) { return "null" }
    return ('"' + (Escape-Json $n) + '"')
  } catch { return "null" }
}

function Get-DrawerKickBytes {
  $pulse = [byte[]](0x1b, 0x40, 0x1b, 0x70, 0x00, 0x19, 0xfa, 0x1b, 0x70, 0x01, 0x19, 0xfa, 0x0a, 0x0a)
  $bytes = New-Object byte[] 64
  [System.Buffer]::BlockCopy($pulse, 0, $bytes, 0, $pulse.Length)
  return $bytes
}

function Handle-Request($Req, $Stream) {
  $method = $Req.Method
  $path = $Req.Path

  if ($method -eq "OPTIONS") {
    Write-HttpResponse $Stream 204 "" "text/plain"
    return
  }

  if ($method -eq "GET" -and ($path -eq "/health" -or $path -eq "/")) {
    $spoolerJson = "false"
    try {
      $sp = Get-Service -Name Spooler -ErrorAction SilentlyContinue
      if ($sp -and $sp.Status -eq "Running") { $spoolerJson = "true" }
    } catch { }
    $body = '{"ok":true,"platform":"win32","spooler":' + $spoolerJson + ',"powershell":true,"networkRaw":true,"noNode":true,"printEngine":"v5-bypass-epson","listEngine":"usb-pnp-v2","port":' + $Port + ',"printerName":' + (Get-ConfiguredPrinterJson) + '}'
    Write-HttpResponse $Stream 200 $body "application/json"
    return
  }

  if ($method -eq "GET" -and $path -eq "/printers") {
    try {
      $rows = @(Get-PrinterRows)
      $json = Convert-PrintersToJson $rows
      Write-HttpResponse $Stream 200 $json "application/json"
    } catch {
      Write-HttpResponse $Stream 502 $_.Exception.Message "text/plain"
    }
    return
  }

  if ($method -eq "POST" -and ($path -eq "/print" -or $path -eq "/drawer/kick")) {
    $isDrawer = ($path -eq "/drawer/kick")
    $bytes = $Req.Body
    if ($isDrawer) {
      $bytes = Get-DrawerKickBytes
    } elseif ($null -eq $bytes -or $bytes.Length -eq 0) {
      Write-HttpResponse $Stream 400 "empty body" "text/plain"
      return
    }
    if (-not $isDrawer -and $bytes.Length -gt 256000) {
      Write-HttpResponse $Stream 413 "payload too large" "text/plain"
      return
    }

    $netHost = Get-HeaderValue $Req.Headers "X-Printer-Host"
    $netPortRaw = Get-HeaderValue $Req.Headers "X-Printer-Port"
    $cups = Get-HeaderValue $Req.Headers "X-Printer-Cups-Name"
    if (-not $netPortRaw) { $netPortRaw = "9100" }
    $netPort = 9100
    try { $netPort = [int]$netPortRaw } catch { $netPort = 9100 }

    try {
      if ($netHost -and $netHost.Trim()) {
        Send-NetworkRaw $netHost.Trim() $netPort $bytes
        $extra = ""
        if ($isDrawer) { $extra = ',"drawer":true' }
        $body = '{"ok":true,"mode":"network","host":"' + (Escape-Json $netHost.Trim()) + '","port":' + $netPort + $extra + '}'
        Write-HttpResponse $Stream 200 $body "application/json"
      } elseif ($cups -and $cups.Trim()) {
        Send-WindowsRaw $cups.Trim() $bytes
        $extra = ""
        if ($isDrawer) { $extra = ',"drawer":true' }
        $body = '{"ok":true,"mode":"windows","name":"' + (Escape-Json $cups.Trim()) + '","platform":"win32"' + $extra + '}'
        Write-HttpResponse $Stream 200 $body "application/json"
      } else {
        Write-HttpResponse $Stream 400 "Missing or invalid X-Printer-Cups-Name (or X-Printer-Host)" "text/plain"
      }
    } catch {
      Write-BridgeLog ("Print error: " + $_.Exception.Message)
      Write-HttpResponse $Stream 502 $_.Exception.Message "text/plain"
    }
    return
  }

  Write-HttpResponse $Stream 404 "not found" "text/plain"
}

if ($ListOnly) {
  try {
    $json = Convert-PrintersToJson @(Get-PrinterRows)
    [Console]::OutputEncoding = New-Object System.Text.UTF8Encoding $false
    [Console]::Out.Write($json)
    exit 0
  } catch {
    [Console]::Error.WriteLine($_.Exception.Message)
    exit 1
  }
}

try {
  Write-BridgeLog ("starting TcpListener 127.0.0.1:" + $Port)
  $listener = New-Object System.Net.Sockets.TcpListener([System.Net.IPAddress]::Loopback, $Port)
  $listener.Start()
  Write-BridgeLog "Till Print Bridge (Windows 10/PowerShell) listening on http://127.0.0.1:$Port/"
  Write-BridgeLog "No Node.js required. Log: $LogFile"

  while ($true) {
    $client = $null
    $stream = $null
    try {
      $client = $listener.AcceptTcpClient()
      $stream = $client.GetStream()
      $stream.ReadTimeout = 15000
      $stream.WriteTimeout = 15000
      $req = Read-HttpRequest $stream
      Handle-Request $req $stream
    } catch {
      Write-BridgeLog ("Request error: " + $_.Exception.Message)
      try {
        if ($stream) {
          Write-HttpResponse $stream 500 $_.Exception.Message "text/plain"
        }
      } catch { }
    } finally {
      try { if ($stream) { $stream.Close() } } catch { }
      try { if ($client) { $client.Close() } } catch { }
    }
  }
} catch {
  Write-BridgeLog ("FATAL: " + $_.Exception.Message)
  try { Write-BridgeLog ([string]$_.ScriptStackTrace) } catch { }
  Write-BridgeLog "If this PC blocked the script, Unblock-File the .ps1 or re-run Install-Palmart-Print-Bridge.cmd"
  exit 1
}
