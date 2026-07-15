# Palmart Windows ESC/POS raw sender (v5).
# Epson ePOS drivers reject spooler RAW (StartDocPrinter) - we bypass the spooler.
param(
  [Parameter(Mandatory = $true)][string]$PrinterName,
  [Parameter(Mandatory = $true)][string]$FilePath
)

$ErrorActionPreference = "Stop"
$script:PrintEngine = "v5-bypass-epson"

if (-not (Test-Path -LiteralPath $FilePath)) {
  throw ("Print file not found: " + $FilePath)
}
$bytes = [System.IO.File]::ReadAllBytes($FilePath)
if ($bytes.Length -lt 1) {
  throw "Print file is empty."
}

if (-not ("PalmartRawPrintV5" -as [type])) {
Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;

public class PalmartRawPrintV5 {
  [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Ansi)]
  public class DOCINFOA {
    [MarshalAs(UnmanagedType.LPStr)] public string pDocName;
    [MarshalAs(UnmanagedType.LPStr)] public string pOutputFile;
    [MarshalAs(UnmanagedType.LPStr)] public string pDatatype;
  }

  [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Ansi)]
  public class PRINTER_DEFAULTSA {
    [MarshalAs(UnmanagedType.LPStr)] public string pDatatype;
    public IntPtr pDevMode;
    public int DesiredAccess;
  }

  [DllImport("winspool.drv", EntryPoint = "OpenPrinterA", SetLastError = true, CharSet = CharSet.Ansi, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
  public static extern bool OpenPrinter([MarshalAs(UnmanagedType.LPStr)] string szPrinter, out IntPtr hPrinter, IntPtr pd);

  [DllImport("winspool.drv", EntryPoint = "OpenPrinterA", SetLastError = true, CharSet = CharSet.Ansi, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
  public static extern bool OpenPrinterDefaults([MarshalAs(UnmanagedType.LPStr)] string szPrinter, out IntPtr hPrinter, [In] PRINTER_DEFAULTSA pd);

  [DllImport("winspool.drv", EntryPoint = "ClosePrinter", SetLastError = true, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
  public static extern bool ClosePrinter(IntPtr hPrinter);

  [DllImport("winspool.drv", EntryPoint = "StartDocPrinterA", SetLastError = true, CharSet = CharSet.Ansi, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
  public static extern bool StartDocPrinter(IntPtr hPrinter, int level, [In, MarshalAs(UnmanagedType.LPStruct)] DOCINFOA di);

  [DllImport("winspool.drv", EntryPoint = "EndDocPrinter", SetLastError = true, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
  public static extern bool EndDocPrinter(IntPtr hPrinter);

  [DllImport("winspool.drv", EntryPoint = "StartPagePrinter", SetLastError = true, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
  public static extern bool StartPagePrinter(IntPtr hPrinter);

  [DllImport("winspool.drv", EntryPoint = "EndPagePrinter", SetLastError = true, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
  public static extern bool EndPagePrinter(IntPtr hPrinter);

  [DllImport("winspool.drv", EntryPoint = "WritePrinter", SetLastError = true, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
  public static extern bool WritePrinter(IntPtr hPrinter, IntPtr pBytes, int dwCount, out int dwWritten);

  [DllImport("kernel32.dll", SetLastError = true, CharSet = CharSet.Auto)]
  public static extern IntPtr CreateFile(string lpFileName, uint dwDesiredAccess, uint dwShareMode, IntPtr lpSecurityAttributes, uint dwCreationDisposition, uint dwFlagsAndAttributes, IntPtr hTemplateFile);

  [DllImport("kernel32.dll", SetLastError = true)]
  public static extern bool WriteFile(IntPtr hFile, byte[] lpBuffer, uint nNumberOfBytesToWrite, out uint lpNumberOfBytesWritten, IntPtr lpOverlapped);

  [DllImport("kernel32.dll", SetLastError = true)]
  public static extern bool CloseHandle(IntPtr hObject);

  public const uint GENERIC_WRITE = 0x40000000;
  public const uint FILE_SHARE_READ = 0x00000001;
  public const uint FILE_SHARE_WRITE = 0x00000002;
  public const uint OPEN_EXISTING = 3;
  public const uint FILE_ATTRIBUTE_NORMAL = 0x80;
  public const int PRINTER_ACCESS_USE = 0x00000008;

  public static bool IsInvalid(IntPtr h) {
    return h == IntPtr.Zero || h == new IntPtr(-1);
  }

  public static string SendViaSpooler(string printerName, byte[] data) {
    // Try with PRINTER_DEFAULTS datatype RAW first (some drivers need this).
    string[] openModes = new string[] { "RAW", "TEXT", "" };
    int lastErr = 0;
    for (int m = 0; m < openModes.Length; m++) {
      IntPtr hPrinter = IntPtr.Zero;
      bool opened = false;
      if (openModes[m].Length > 0) {
        PRINTER_DEFAULTSA pd = new PRINTER_DEFAULTSA();
        pd.pDatatype = openModes[m];
        pd.pDevMode = IntPtr.Zero;
        pd.DesiredAccess = PRINTER_ACCESS_USE;
        opened = OpenPrinterDefaults(printerName, out hPrinter, pd);
      } else {
        opened = OpenPrinter(printerName, out hPrinter, IntPtr.Zero);
      }
      if (!opened) {
        lastErr = Marshal.GetLastWin32Error();
        continue;
      }
      try {
        string[] dtypes = new string[] { "RAW", "TEXT", null };
        bool started = false;
        for (int i = 0; i < dtypes.Length; i++) {
          DOCINFOA di = new DOCINFOA();
          di.pDocName = "Palmart ESC/POS";
          di.pOutputFile = null;
          di.pDatatype = dtypes[i];
          if (StartDocPrinter(hPrinter, 1, di)) {
            started = true;
            break;
          }
          lastErr = Marshal.GetLastWin32Error();
        }
        if (!started) continue;
        try {
          if (!StartPagePrinter(hPrinter)) {
            lastErr = Marshal.GetLastWin32Error();
            continue;
          }
          try {
            GCHandle pinned = GCHandle.Alloc(data, GCHandleType.Pinned);
            try {
              int written = 0;
              if (!WritePrinter(hPrinter, pinned.AddrOfPinnedObject(), data.Length, out written)) {
                lastErr = Marshal.GetLastWin32Error();
                continue;
              }
            } finally {
              pinned.Free();
            }
          } finally {
            EndPagePrinter(hPrinter);
          }
        } finally {
          EndDocPrinter(hPrinter);
        }
        return null;
      } finally {
        ClosePrinter(hPrinter);
      }
    }
    return "SpoolerRejectedRaw Win32 " + lastErr;
  }

  public static string SendViaPortDevice(string portName, byte[] data) {
    if (string.IsNullOrEmpty(portName)) return "empty port";
    string trimmed = portName.Trim();
    string[] candidates = new string[] {
      trimmed,
      @"\\.\" + trimmed,
      @"\\.\" + trimmed.TrimEnd(':'),
      trimmed.TrimEnd(':'),
      @"\\.\" + trimmed.ToUpperInvariant(),
      trimmed.ToUpperInvariant()
    };
    string last = "no candidate";
    uint[] shares = new uint[] { FILE_SHARE_READ | FILE_SHARE_WRITE, 0 };
    for (int i = 0; i < candidates.Length; i++) {
      string path = candidates[i];
      if (string.IsNullOrEmpty(path)) continue;
      for (int s = 0; s < shares.Length; s++) {
        IntPtr h = CreateFile(path, GENERIC_WRITE, shares[s], IntPtr.Zero, OPEN_EXISTING, FILE_ATTRIBUTE_NORMAL, IntPtr.Zero);
        if (IsInvalid(h)) {
          last = "CreateFile '" + path + "' Win32 " + Marshal.GetLastWin32Error();
          continue;
        }
        try {
          uint written = 0;
          if (!WriteFile(h, data, (uint)data.Length, out written, IntPtr.Zero)) {
            last = "WriteFile '" + path + "' Win32 " + Marshal.GetLastWin32Error();
            continue;
          }
          return null;
        } finally {
          CloseHandle(h);
        }
      }
    }
    return last;
  }
}
"@
}

function Get-PrinterWmi([string]$Name) {
  $safe = $Name -replace "'", "''"
  try {
    return Get-WmiObject Win32_Printer -Filter ("Name='" + $safe + "'")
  } catch {
    return $null
  }
}

function Test-IsEpsonish([string]$Driver, [string]$Printer, [string]$Port) {
  $blob = (($Driver + " " + $Printer + " " + $Port)).ToLower()
  return [bool]($blob -match 'epos|epson|tm-|tm_|thermal|receipt|esc.?pos')
}

function Resolve-PrinterName([string]$Wanted) {
  $Wanted = $Wanted.Trim()
  $h = [IntPtr]::Zero
  if ([PalmartRawPrintV5]::OpenPrinter($Wanted, [ref]$h, [IntPtr]::Zero)) {
    [void][PalmartRawPrintV5]::ClosePrinter($h)
    return $Wanted
  }
  $names = @()
  try {
    $names = @(Get-WmiObject Win32_Printer | ForEach-Object { [string]$_.Name })
  } catch { }
  $names = @($names | Where-Object { $_ -and $_.Trim() } | ForEach-Object { $_.Trim() })
  if ($names.Count -eq 0) {
    throw "No Windows printers found. Add Generic / Text Only, then Detect printers."
  }
  foreach ($n in $names) {
    if ([string]::Compare($n, $Wanted, $true) -eq 0) { return $n }
  }
  $norm = (($Wanted -replace "\s+", " ").Trim()).ToLower()
  $hits = @()
  foreach ($n in $names) {
    $nn = (($n -replace "\s+", " ").Trim()).ToLower()
    if ($nn -eq $norm) { $hits += $n }
  }
  if ($hits.Count -eq 1) { return $hits[0] }
  $hits = @()
  foreach ($n in $names) {
    $nn = $n.ToLower()
    if ($nn.Contains($norm) -or $norm.Contains((($n -replace "\s+", " ").Trim()).ToLower())) {
      $hits += $n
    }
  }
  if ($hits.Count -eq 1) { return $hits[0] }
  throw ("Printer '" + $Wanted + "' not found. Installed: " + ([string]::Join(", ", $names)))
}

function Test-PortLooksWritable([string]$Port) {
  if (-not $Port) { return $false }
  $p = $Port.Trim()
  if ($p -match '^(FILE|PORTPROMPT|NUL|SHR|WSD|TS):?' ) { return $false }
  if ($p -match '^\\\\') { return $false }
  if ($p -match '^(USB|COM|LPT)\d+' ) { return $true }
  if ($p -match '^(ESDPRT|EPNS|TMUSB|EPSON|DOT4|USBPRINT|EPOS)' ) { return $true }
  if ($p -match '^[A-Za-z][A-Za-z0-9_ ]{1,48}$' -and $p -notmatch '\.') { return $true }
  return $false
}

function Get-TcpHostForPort([string]$PortName) {
  if (-not $PortName) { return $null }
  if ($PortName -match 'IP_(\d+\.\d+\.\d+\.\d+)') { return $Matches[1] }
  if ($PortName -match '^(\d+\.\d+\.\d+\.\d+)(_|:|$)') { return $Matches[1] }
  try {
    $safe = $PortName -replace "'", "''"
    $tcp = Get-WmiObject Win32_TCPIPPrinterPort -Filter ("Name='" + $safe + "'") -ErrorAction SilentlyContinue
    if ($tcp -and $tcp.HostAddress) { return [string]$tcp.HostAddress }
  } catch { }
  return $null
}

function Send-ViaTcpHost([string]$Ip, [byte[]]$Payload) {
  if (-not $Ip) { return "no ip" }
  try {
    $client = New-Object System.Net.Sockets.TcpClient
    $iar = $client.BeginConnect($Ip, 9100, $null, $null)
    $ok = $iar.AsyncWaitHandle.WaitOne(5000, $false)
    if (-not $ok) {
      try { $client.Close() } catch { }
      return ("tcp timeout " + $Ip + ":9100")
    }
    $client.EndConnect($iar)
    $stream = $client.GetStream()
    $stream.Write($Payload, 0, $Payload.Length)
    $stream.Flush()
    $client.Close()
    return $null
  } catch {
    return ("tcp " + $Ip + ":9100 " + $_.Exception.Message)
  }
}

function Get-CandidatePorts([string]$PrimaryPort, [string]$PrinterName) {
  $set = New-Object System.Collections.ArrayList
  if ($PrimaryPort) { [void]$set.Add($PrimaryPort.Trim()) }
  # If this queue looks like Epson/ePOS, also try ports on similarly named queues only.
  try {
    $want = $PrinterName.ToLower()
    foreach ($pr in @(Get-WmiObject Win32_Printer)) {
      $n = [string]$pr.Name
      $p = [string]$pr.PortName
      if (-not $p -or -not (Test-PortLooksWritable $p)) { continue }
      if ($set.Contains($p)) { continue }
      $nl = $n.ToLower()
      if ($nl -eq $want) { [void]$set.Add($p); continue }
      if (($want -match 'epos|epson') -and ($nl -match 'epos|epson') -and ($p -match '^(ESDPRT|EPNS|TMUSB|USB|EPOS)')) {
        [void]$set.Add($p)
      }
    }
  } catch { }
  return @($set)
}

function Set-PrinterPaused([object]$Wmi, [bool]$Pause) {
  if (-not $Wmi) { return }
  try {
    if ($Pause) { [void]$Wmi.Pause() } else { [void]$Wmi.Resume() }
  } catch { }
}

function Ensure-PrinterShared([object]$Wmi) {
  if (-not $Wmi) { return $null }
  $existing = [string]$Wmi.ShareName
  if ($existing) { return $existing }
  $share = "PalmartRaw"
  try {
    $Wmi.Shared = $true
    $Wmi.ShareName = $share
    [void]$Wmi.Put()
    Start-Sleep -Milliseconds 400
    return $share
  } catch {
    return $null
  }
}

function Send-ViaShareCopy([string]$ShareName, [string]$BinPath) {
  if (-not $ShareName) { return "not shared" }
  $unc = "\\" + $env:COMPUTERNAME + "\" + $ShareName
  try {
    $psi = New-Object System.Diagnostics.ProcessStartInfo
    $psi.FileName = "cmd.exe"
    $psi.Arguments = '/c copy /b "' + $BinPath + '" "' + $unc + '"'
    $psi.UseShellExecute = $false
    $psi.RedirectStandardOutput = $true
    $psi.RedirectStandardError = $true
    $psi.CreateNoWindow = $true
    $p = [System.Diagnostics.Process]::Start($psi)
    [void]$p.WaitForExit(20000)
    if ($p.ExitCode -eq 0) { return $null }
    $errOut = ""
    try { $errOut = $p.StandardError.ReadToEnd() } catch { }
    return ("copy /b exit " + $p.ExitCode + " " + $errOut)
  } catch {
    return $_.Exception.Message
  }
}

$printer = Resolve-PrinterName $PrinterName
$wmi = Get-PrinterWmi $printer
$port = ""
$driver = ""
$workOffline = $false
if ($wmi) {
  $port = [string]$wmi.PortName
  $driver = [string]$wmi.DriverName
  try { $workOffline = [bool]$wmi.WorkOffline } catch { }
}
$epsonish = Test-IsEpsonish $driver $printer $port
$errors = @()

# Clear offline flag when possible
if ($wmi -and $workOffline) {
  try { $wmi.WorkOffline = $false; [void]$wmi.Put() } catch { }
}

# 1) Pause queue so USB/Epson port can be opened, then write port(s) directly
Set-PrinterPaused $wmi $true
try {
  foreach ($candidate in @(Get-CandidatePorts $port $printer)) {
    if (-not (Test-PortLooksWritable $candidate)) { continue }
    $err = [PalmartRawPrintV5]::SendViaPortDevice($candidate, $bytes)
    if (-not $err) {
      Write-Output ("OK port " + $candidate + " engine=" + $script:PrintEngine)
      exit 0
    }
    $errors += ("port[" + $candidate + "]:" + $err)
  }
} finally {
  Set-PrinterPaused $wmi $false
}

# 2) TCP 9100 via port name or Win32_TCPIPPrinterPort
$ip = Get-TcpHostForPort $port
if ($ip) {
  $err = Send-ViaTcpHost $ip $bytes
  if (-not $err) {
    Write-Output ("OK tcp " + $ip + " engine=" + $script:PrintEngine)
    exit 0
  }
  $errors += ("tcp:" + $err)
}

# 3) Auto-share + copy /b (often works when spooler API rejects RAW)
$share = Ensure-PrinterShared $wmi
$err = Send-ViaShareCopy $share $FilePath
if (-not $err) {
  Write-Output ("OK share " + $share + " engine=" + $script:PrintEngine)
  exit 0
}
$errors += ("share:" + $err)

# 4) Spooler - SKIP for Epson/ePOS (they always reject RAW / StartDocPrinter)
if (-not $epsonish) {
  $err = [PalmartRawPrintV5]::SendViaSpooler($printer, $bytes)
  if (-not $err) {
    Write-Output ("OK spooler " + $printer + " engine=" + $script:PrintEngine)
    exit 0
  }
  $errors += ("spooler:" + $err)
} else {
  $errors += "spooler:skipped (Epson/ePOS driver cannot accept ESC/POS RAW)"
}

$hint = "Remove this printer queue, then add it again with Windows driver 'Generic / Text Only' on the same port ('" + $port + "'), set Online, Detect printers in Cashier, retry."
if ($epsonish) {
  $hint = "Epson/ePOS driver '" + $driver + "' blocks raw receipts. Delete the queue named '" + $printer + "', add printer with driver 'Generic / Text Only' on port '" + $port + "', Detect printers, select that new queue."
}
if ($workOffline) {
  $hint = "Queue was Work Offline. " + $hint
}

throw ("RAW print failed for '" + $printer + "' [engine=" + $script:PrintEngine + ", port='" + $port + "', driver='" + $driver + "']. " + ([string]::Join(" | ", $errors)) + ". " + $hint)
