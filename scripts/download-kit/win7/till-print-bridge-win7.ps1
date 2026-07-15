# Palmart Till Print Bridge for Windows 7 (PowerShell + .NET - no Node.js).
# ASCII-only. Compatible with Windows PowerShell 2.0+.
# Uses TcpListener (NOT HttpListener) so no netsh URL ACL / admin is required.
# Listens on http://127.0.0.1:19500  (same API as the modern Node bridge)

$ErrorActionPreference = "Stop"
$Port = 19500
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

function Handle-Request($Req, $Stream) {
  $method = $Req.Method
  $path = $Req.Path

  if ($method -eq "OPTIONS") {
    Write-HttpResponse $Stream 204 "" "text/plain"
    return
  }

  if ($method -eq "GET" -and ($path -eq "/health" -or $path -eq "/")) {
    $body = '{"ok":true,"platform":"win32","spooler":true,"powershell":true,"networkRaw":true,"win7":true,"port":' + $Port + '}'
    Write-HttpResponse $Stream 200 $body "application/json"
    return
  }

  if ($method -eq "GET" -and $path -eq "/printers") {
    try {
      $rows = @(Get-PrinterRows)
      $json = Convert-PrintersToJson $rows
      Write-HttpResponse $Stream 200 $json "application/json"
    } catch {
      Write-HttpResponse $Stream 500 $_.Exception.Message "text/plain"
    }
    return
  }

  if ($method -eq "POST" -and $path -eq "/print") {
    $bytes = $Req.Body
    if ($null -eq $bytes -or $bytes.Length -eq 0) {
      Write-HttpResponse $Stream 400 "empty body" "text/plain"
      return
    }
    if ($bytes.Length -gt 256000) {
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
        $body = '{"ok":true,"mode":"network","host":"' + (Escape-Json $netHost.Trim()) + '","port":' + $netPort + '}'
        Write-HttpResponse $Stream 200 $body "application/json"
      } elseif ($cups -and $cups.Trim()) {
        Send-WindowsRaw $cups.Trim() $bytes
        $body = '{"ok":true,"mode":"windows","name":"' + (Escape-Json $cups.Trim()) + '","platform":"win32"}'
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

# ---- listen (TcpListener = no URL ACL / admin needed on Win7) ----
$listener = New-Object System.Net.Sockets.TcpListener([System.Net.IPAddress]::Loopback, $Port)
try {
  $listener.Start()
} catch {
  Write-BridgeLog ("FATAL: cannot bind 127.0.0.1:$Port - " + $_.Exception.Message)
  Write-BridgeLog "Is another Palmart bridge already running? Check bridge.log / Task Manager for powershell."
  exit 1
}

Write-BridgeLog "Till Print Bridge (Win7/TcpListener) listening on http://127.0.0.1:$Port/"
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
