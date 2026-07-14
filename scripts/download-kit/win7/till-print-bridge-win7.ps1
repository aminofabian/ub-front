# Palmart Till Print Bridge for Windows 7 (PowerShell + .NET - no Node.js).
# ASCII-only. Compatible with Windows PowerShell 2.0+.
# Listens on http://127.0.0.1:19500  (same API as the modern Node bridge)

$ErrorActionPreference = "Stop"
$Port = 19500
$Prefix = "http://127.0.0.1:$Port/"
# $PSScriptRoot is PS3+; Win7 stock is often PS2.
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
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

function Test-LikelyThermal([string]$Name, [string]$PortName) {
  $blob = ($Name + " " + $PortName).ToLower()
  if ($blob -match "fax|onenote|microsoft print to pdf|microsoft xps|adobe pdf|cutepdf|pdf creator|virtual printer") {
    return $false
  }
  if ($blob -match "caysn|xprinter|epson|tm-|star|bixolon|citizen|pos.?80|receipt|thermal|rongta|gprinter|munbyn|rp58|rp80") {
    return $true
  }
  return $false
}

function Get-PrinterRows {
  $rows = @()
  $printers = Get-WmiObject -Class Win32_Printer -ErrorAction Stop
  foreach ($p in $printers) {
    $name = [string]$p.Name
    if (-not $name) { continue }
    $portName = [string]$p.PortName
    $driver = [string]$p.DriverName
    $isDefault = [bool]$p.Default
    $likely = Test-LikelyThermal $name $portName
    $rows += New-Object PSObject -Property @{
      Name = $name
      PortName = $portName
      DriverName = $driver
      Default = $isDefault
      LikelyThermal = $likely
    }
  }
  return $rows
}

function Convert-PrintersToJson($rows) {
  $suggested = $null
  foreach ($r in $rows) {
    if ($r.LikelyThermal) { $suggested = $r.Name; break }
  }
  if (-not $suggested) {
    foreach ($r in $rows) {
      if ($r.Default) { $suggested = $r.Name; break }
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
  return ('{"ok":true,"platform":"win32","printers":' + $arr + ',"suggested":' + $sugJson + '}')
}

$RawPrintTypeReady = $false
function Ensure-RawPrintType {
  if ($script:RawPrintTypeReady) { return }
  Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
public class PalmartRawPrintWin7 {
  [StructLayout(LayoutKind.Sequential, CharSet=CharSet.Unicode)]
  public class DOCINFO {
    public int cbSize;
    public string pDocName;
    public string pOutputFile;
    public string pDatatype;
  }
  [DllImport("winspool.drv", SetLastError=true, CharSet=CharSet.Unicode)]
  public static extern bool OpenPrinter(string src, out IntPtr hPrinter, IntPtr pd);
  [DllImport("winspool.drv", SetLastError=true)]
  public static extern bool ClosePrinter(IntPtr hPrinter);
  [DllImport("winspool.drv", SetLastError=true, CharSet=CharSet.Unicode)]
  public static extern bool StartDocPrinter(IntPtr hPrinter, int level, [In] DOCINFO di);
  [DllImport("winspool.drv", SetLastError=true)]
  public static extern bool EndDocPrinter(IntPtr hPrinter);
  [DllImport("winspool.drv", SetLastError=true)]
  public static extern bool StartPagePrinter(IntPtr hPrinter);
  [DllImport("winspool.drv", SetLastError=true)]
  public static extern bool EndPagePrinter(IntPtr hPrinter);
  [DllImport("winspool.drv", SetLastError=true)]
  public static extern bool WritePrinter(IntPtr hPrinter, IntPtr pBytes, int dwCount, out int dwWritten);
}
"@
  $script:RawPrintTypeReady = $true
}

function Send-WindowsRaw([string]$PrinterName, [byte[]]$Bytes) {
  Ensure-RawPrintType
  $hPrinter = [IntPtr]::Zero
  if (-not [PalmartRawPrintWin7]::OpenPrinter($PrinterName, [ref]$hPrinter, [IntPtr]::Zero)) {
    throw "OpenPrinter failed for '$PrinterName'"
  }
  try {
    $di = New-Object PalmartRawPrintWin7+DOCINFO
    $di.pDocName = "Palmart ESC/POS"
    $di.pDatatype = "RAW"
    $di.cbSize = [System.Runtime.InteropServices.Marshal]::SizeOf($di)
    if (-not [PalmartRawPrintWin7]::StartDocPrinter($hPrinter, 1, $di)) {
      throw "StartDocPrinter failed (is the queue RAW-capable?)"
    }
    try {
      [void][PalmartRawPrintWin7]::StartPagePrinter($hPrinter)
      $pinned = [System.Runtime.InteropServices.GCHandle]::Alloc($Bytes, [System.Runtime.InteropServices.GCHandleType]::Pinned)
      try {
        $written = 0
        $ptr = $pinned.AddrOfPinnedObject()
        if (-not [PalmartRawPrintWin7]::WritePrinter($hPrinter, $ptr, $Bytes.Length, [ref]$written)) {
          throw "WritePrinter failed"
        }
      } finally {
        $pinned.Free()
      }
      [void][PalmartRawPrintWin7]::EndPagePrinter($hPrinter)
    } finally {
      [void][PalmartRawPrintWin7]::EndDocPrinter($hPrinter)
    }
  } finally {
    [void][PalmartRawPrintWin7]::ClosePrinter($hPrinter)
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

function Read-RequestBody($Request) {
  $len = [int]$Request.ContentLength64
  if ($len -gt 0) {
    $buffer = New-Object byte[] $len
    $read = 0
    while ($read -lt $len) {
      $n = $Request.InputStream.Read($buffer, $read, $len - $read)
      if ($n -le 0) { break }
      $read += $n
    }
    if ($read -lt $len) {
      $trim = New-Object byte[] $read
      [Array]::Copy($buffer, $trim, $read)
      return $trim
    }
    return $buffer
  }
  # Avoid Stream.CopyTo (.NET 4+ only); Win7 may be on .NET 3.5.
  $ms = New-Object System.IO.MemoryStream
  $buf = New-Object byte[] 4096
  do {
    $n = $Request.InputStream.Read($buf, 0, $buf.Length)
    if ($n -gt 0) { $ms.Write($buf, 0, $n) }
  } while ($n -gt 0)
  return $ms.ToArray()
}

function Write-Response($Response, [int]$StatusCode, [string]$Body, [string]$ContentType) {
  $Response.StatusCode = $StatusCode
  $Response.Headers.Add("Access-Control-Allow-Origin", "*")
  $Response.Headers.Add("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
  $Response.Headers.Add("Access-Control-Allow-Headers", "Content-Type, X-Printer-Cups-Name, X-Printer-Host, X-Printer-Port")
  $Response.Headers.Add("Access-Control-Allow-Private-Network", "true")
  if (-not $ContentType) { $ContentType = "text/plain" }
  $Response.ContentType = $ContentType
  $bytes = [System.Text.Encoding]::UTF8.GetBytes($Body)
  $Response.ContentLength64 = $bytes.Length
  $Response.OutputStream.Write($bytes, 0, $bytes.Length)
  $Response.OutputStream.Close()
}

# Single-instance: fail cleanly if port taken
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add($Prefix)
try {
  $listener.Start()
} catch {
  Write-BridgeLog ("Port $Port already in use or URL ACL blocked: " + $_.Exception.Message)
  Write-BridgeLog "If another Palmart bridge is running, that is OK."
  exit 0
}

Write-BridgeLog "Till Print Bridge (Win7) listening on $Prefix"
Write-BridgeLog "No Node.js required. Log: $LogFile"

while ($listener.IsListening) {
  $ctx = $null
  try {
    $ctx = $listener.GetContext()
  } catch {
    Write-BridgeLog ("GetContext error: " + $_.Exception.Message)
    continue
  }

  $req = $ctx.Request
  $res = $ctx.Response
  $method = $req.HttpMethod.ToUpper()
  $path = $req.Url.AbsolutePath.TrimEnd("/")
  if (-not $path) { $path = "/" }

  try {
    if ($method -eq "OPTIONS") {
      Write-Response $res 204 "" "text/plain"
      continue
    }

    if ($method -eq "GET" -and ($path -eq "/health" -or $path -eq "/")) {
      $body = '{"ok":true,"platform":"win32","spooler":true,"powershell":true,"networkRaw":true,"win7":true,"port":' + $Port + '}'
      Write-Response $res 200 $body "application/json"
      continue
    }

    if ($method -eq "GET" -and $path -eq "/printers") {
      try {
        $rows = @(Get-PrinterRows)
        $json = Convert-PrintersToJson $rows
        Write-Response $res 200 $json "application/json"
      } catch {
        Write-Response $res 500 $_.Exception.Message "text/plain"
      }
      continue
    }

    if ($method -eq "POST" -and $path -eq "/print") {
      $bytes = Read-RequestBody $req
      if ($null -eq $bytes -or $bytes.Length -eq 0) {
        Write-Response $res 400 "empty body" "text/plain"
        continue
      }
      if ($bytes.Length -gt 256000) {
        Write-Response $res 413 "payload too large" "text/plain"
        continue
      }

      $netHost = [string]$req.Headers["X-Printer-Host"]
      $netPortRaw = [string]$req.Headers["X-Printer-Port"]
      $cups = [string]$req.Headers["X-Printer-Cups-Name"]
      if (-not $netPortRaw) { $netPortRaw = "9100" }
      $netPort = 9100
      try { $netPort = [int]$netPortRaw } catch { $netPort = 9100 }

      try {
        if ($netHost -and $netHost.Trim()) {
          Send-NetworkRaw $netHost.Trim() $netPort $bytes
          $body = '{"ok":true,"mode":"network","host":"' + (Escape-Json $netHost.Trim()) + '","port":' + $netPort + '}'
          Write-Response $res 200 $body "application/json"
        } elseif ($cups -and $cups.Trim()) {
          Send-WindowsRaw $cups.Trim() $bytes
          $body = '{"ok":true,"mode":"windows","name":"' + (Escape-Json $cups.Trim()) + '","platform":"win32"}'
          Write-Response $res 200 $body "application/json"
        } else {
          Write-Response $res 400 "Missing or invalid X-Printer-Cups-Name (or X-Printer-Host)" "text/plain"
        }
      } catch {
        Write-BridgeLog ("Print error: " + $_.Exception.Message)
        Write-Response $res 502 $_.Exception.Message "text/plain"
      }
      continue
    }

    Write-Response $res 404 "not found" "text/plain"
  } catch {
    try {
      Write-BridgeLog ("Request error: " + $_.Exception.Message)
      Write-Response $res 500 $_.Exception.Message "text/plain"
    } catch { }
  }
}
