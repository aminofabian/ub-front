# Palmart Till Print Bridge for Windows 10 / 11 (PowerShell + .NET - no Node.js).
# ASCII-only. Same HTTP API as the Win7 / Node bridges: http://127.0.0.1:19500
# Uses TcpListener so no netsh URL ACL / admin is required.
#
# On Detect (/printers) this also turns USB Printing Support / COM POS devices
# into a Generic / Text Only queue so they show up (Device Manager is not enough).
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
  return [bool]($Name -match "USB Printing|POS-?80|POS80|Xprinter|X-Printer|XP-?\d+|Thermal|Receipt|Gprinter|Rongta|Caysn|Munbyn|CH340|CH341|CP210|USB.?Serial|USB.?COM|Printer")
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

function Get-UsbPrintPorts {
  $ports = New-Object System.Collections.ArrayList

  try {
    $item = Get-ItemProperty "HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Ports" -ErrorAction SilentlyContinue
    if ($item) {
      foreach ($prop in $item.PSObject.Properties) {
        $n = [string]$prop.Name
        if ($n -match "^(PS|Computer|Path|Provider)") { continue }
        $n = $n.Trim().TrimEnd(":")
        if ($n -match "^(USB|COM|LPT|DOT4)\d+") {
          if (-not $ports.Contains($n)) { [void]$ports.Add($n) }
        }
      }
    }
  } catch { }

  try {
    foreach ($p in @(Get-PrinterPort -ErrorAction SilentlyContinue)) {
      $n = ([string]$p.Name).Trim()
      if ($n -match "^(USB|COM|LPT|DOT4|USBPRINT|ESDPRT|TMUSB)") {
        if (-not $ports.Contains($n)) { [void]$ports.Add($n) }
      }
    }
  } catch { }

  try {
    foreach ($c in [System.IO.Ports.SerialPort]::GetPortNames()) {
      $n = ([string]$c).Trim()
      if ($n -and -not $ports.Contains($n)) { [void]$ports.Add($n) }
    }
  } catch { }

  return @($ports)
}

function Get-ReceiptComPortsFromPnp {
  $found = New-Object System.Collections.ArrayList
  $devs = @()
  try { $devs = @(Get-PnpDevice -Status OK -ErrorAction SilentlyContinue) } catch { $devs = @() }
  if ($devs.Count -eq 0) {
    try { $devs = @(Get-WmiObject Win32_PnPEntity -ErrorAction SilentlyContinue) } catch { $devs = @() }
  }
  foreach ($d in $devs) {
    $n = [string]$d.FriendlyName
    if (-not $n) { $n = [string]$d.Name }
    if (-not (Test-LikelyReceiptPnp $n)) { continue }
    if ($n -match "\((COM\d+)\)") {
      $com = $Matches[1]
      if (-not $found.Contains($com)) { [void]$found.Add($com) }
    }
  }
  return @($found)
}

function Get-UsedPrinterPorts {
  $used = @{}
  try {
    foreach ($p in @(Get-WmiObject -Class Win32_Printer -ErrorAction SilentlyContinue)) {
      $pn = ([string]$p.PortName).Trim().TrimEnd(":")
      if ($pn) { $used[$pn] = $true }
    }
  } catch { }
  try {
    foreach ($p in @(Get-Printer -ErrorAction SilentlyContinue)) {
      $pn = ([string]$p.PortName).Trim().TrimEnd(":")
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
  try {
    Add-Printer -Name $Name -DriverName $driver -PortName $Port -ErrorAction Stop
    Write-BridgeLog ("Added queue '" + $Name + "' driver='" + $driver + "' port=" + $Port)
    return $true
  } catch { }
  try {
    $inf = Join-Path $env:SystemRoot "inf\ntprint.inf"
    $argLine = "printui.dll,PrintUIEntry /if /b `"" + $Name + "`" /f `"" + $inf + "`" /r `"" + $Port + "`" /m `"Generic / Text Only`""
    $psi = New-Object System.Diagnostics.ProcessStartInfo
    $psi.FileName = "rundll32.exe"
    $psi.Arguments = $argLine
    $psi.UseShellExecute = $false
    $psi.CreateNoWindow = $true
    $p = [System.Diagnostics.Process]::Start($psi)
    [void]$p.WaitForExit(15000)
    Start-Sleep -Milliseconds 600
    $safe = $Name -replace "'", "''"
    $check = Get-WmiObject Win32_Printer -Filter ("Name='" + $safe + "'") -ErrorAction SilentlyContinue
    if ($check) {
      Write-BridgeLog ("Added queue via printui '" + $Name + "' port=" + $Port)
      return $true
    }
  } catch { }
  Write-BridgeLog ("Could not add queue '" + $Name + "' on " + $Port + " (will still list the port)")
  return $false
}

function Ensure-UsbReceiptQueues {
  try {
  Ensure-PrintSpooler
  $used = Get-UsedPrinterPorts
  $existingNames = @{}
  try {
    foreach ($p in @(Get-WmiObject -Class Win32_Printer -ErrorAction SilentlyContinue)) {
      $n = [string]$p.Name
      if ($n) { $existingNames[$n] = $true }
    }
  } catch { }

  $targets = New-Object System.Collections.ArrayList

  foreach ($port in @(Get-UsbPrintPorts)) {
    if ($used.ContainsKey($port)) { continue }
    if ($port -match "^(USB|DOT4)\d+") {
      [void]$targets.Add($port)
    }
  }

  foreach ($com in @(Get-ReceiptComPortsFromPnp)) {
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
    $pn = ([string]$row.PortName).Trim().TrimEnd(":")
    if ($pn) { $usedPorts[$pn] = $true }
  }
  foreach ($port in @(Get-UsbPrintPorts)) {
    if ($usedPorts.ContainsKey($port)) { continue }
    if ($port -notmatch "^(USB|COM|DOT4)\d+") { continue }
    if ($port -match "^COM[12]$") { continue }
    $byName[$port] = New-PrinterRow $port $port "port" $false
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

function Get-DrawerKickBytes {
  return [byte[]](0x1b, 0x70, 0x00, 0x19, 0xfa, 0x1b, 0x70, 0x01, 0x19, 0xfa)
}

function Handle-Request($Req, $Stream) {
  $method = $Req.Method
  $path = $Req.Path

  if ($method -eq "OPTIONS") {
    Write-HttpResponse $Stream 204 "" "text/plain"
    return
  }

  if ($method -eq "GET" -and ($path -eq "/health" -or $path -eq "/")) {
    $body = '{"ok":true,"platform":"win32","spooler":true,"powershell":true,"networkRaw":true,"noNode":true,"printEngine":"v5-bypass-epson","port":' + $Port + '}'
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
