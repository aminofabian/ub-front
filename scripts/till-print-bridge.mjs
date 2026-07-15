#!/usr/bin/env node
/**
 * Till Print Bridge — run on the cashier PC (USB / local / network thermal printer).
 *
 * Cloud-hosted Palmart cannot reach USB printers. This small local server
 * listens on 127.0.0.1:19500 and accepts raw ESC/POS from the browser.
 *
 * Platforms:
 *   macOS / Linux — CUPS (`lp` / `lpstat`)
 *   Windows       — spooler RAW via PowerShell Win32 WritePrinter
 *   All           — Ethernet/Wi‑Fi ESC/POS on TCP port 9100 (X-Printer-Host)
 *
 * Usage:
 *   Windows (recommended): run Install-Palmart-Print-Bridge.cmd once — autostarts hidden.
 *   Dev / manual: node scripts/till-print-bridge.mjs
 *   pnpm till-print-bridge
 *
 * Optional: TILL_PRINT_BRIDGE_LOG=/path/to/bridge.log for headless file logging.
 */

import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { createConnection } from "node:net";
import { appendFileSync, existsSync } from "node:fs";
import { unlink, writeFile } from "node:fs/promises";
import { platform as osPlatform, tmpdir } from "node:os";
import { join } from "node:path";

const PORT = Number(process.env.TILL_PRINT_BRIDGE_PORT || 19500);
const HOST = "127.0.0.1";
const PLATFORM = osPlatform(); // darwin | linux | win32 | …
const IS_WIN = PLATFORM === "win32";
const IS_UNIX = PLATFORM === "darwin" || PLATFORM === "linux";
const LOG_FILE = (process.env.TILL_PRINT_BRIDGE_LOG || "").trim();

function logLine(...parts) {
  const line = parts.map((p) => String(p)).join(" ");
  try {
    console.log(line);
  } catch {
    // ignore broken stdout when detached
  }
  if (!LOG_FILE) return;
  try {
    appendFileSync(LOG_FILE, `${new Date().toISOString()} ${line}\n`, "utf8");
  } catch {
    // ignore log write failures
  }
}

const LP_BIN = ["/usr/bin/lp", "/bin/lp"].find((p) => existsSync(p));
const LPSTAT_BIN = ["/usr/bin/lpstat", "/bin/lpstat"].find((p) => existsSync(p));

/** CUPS queue names (unix). */
const UNIX_NAME_RE = /^[A-Za-z0-9._-]+$/;
/** Windows printer display names (spaces / parens allowed). */
const WIN_NAME_RE = /^[^\\/:*?"<>|]{1,200}$/;
const HOST_RE = /^[A-Za-z0-9._:-]+$/;
const MAX_BODY = 256_000;
const DEFAULT_RAW_PORT = 9100;

/** Names that look like retail/thermal receipt printers (prefer when auto-picking). */
const THERMAL_HINT_RE =
  /caysn|xprinter|epson.?tm|tm-|tm_|star.?tsp|bixolon|citizen|pos[-_ ]?80|receipt|thermal|cn\d{2,}|rp[-_]?\d|tsp\d*|tsp100|tsp143|rongta|gprinter|munbyn|rpp0|rp58|rp80/i;

/** Virtual / non-receipt devices to deprioritize (esp. Windows). */
const NOISE_PRINTER_RE =
  /fax|oneNote|microsoft.?print.?to.?pdf|microsoft.?xps|adobe.?pdf|send.?to.?onenote|fax.?printer|anydesk|snagit|cutepdf|doPDF|bullzip|novaPDF|pdf.?creator|virtual.?printer|fax$/i;

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, X-Printer-Cups-Name, X-Printer-Host, X-Printer-Port",
  // Chrome Private Network Access: HTTPS cloud cashier → http://127.0.0.1
  "Access-Control-Allow-Private-Network": "true",
};

function send(res, status, body, type = "text/plain") {
  const text = typeof body === "string" ? body : JSON.stringify(body);
  res.writeHead(status, {
    ...CORS,
    "Content-Type": type,
    "Content-Length": Buffer.byteLength(text),
  });
  res.end(text);
}

function readRequest(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

function runCmd(bin, args, opts = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(bin, args, {
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
      ...opts,
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (c) => {
      stdout += c.toString();
    });
    child.stderr.on("data", (c) => {
      stderr += c.toString();
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve(stdout);
      else reject(new Error(stderr.trim() || `${bin} exited ${code}`));
    });
  });
}

function isValidPrinterName(name) {
  if (!name) return false;
  if (IS_WIN) return WIN_NAME_RE.test(name);
  return UNIX_NAME_RE.test(name);
}

function isNoisePrinter(name, uri = "") {
  return NOISE_PRINTER_RE.test(name) || NOISE_PRINTER_RE.test(uri);
}

function isLikelyThermal(name, uri = "") {
  if (isNoisePrinter(name, uri)) return false;
  return THERMAL_HINT_RE.test(name) || THERMAL_HINT_RE.test(uri);
}

function rankAndSuggest(printers, defaultName) {
  printers.sort((a, b) => {
    if (a.likelyThermal !== b.likelyThermal) return a.likelyThermal ? -1 : 1;
    const aNoise = isNoisePrinter(a.name, a.uri);
    const bNoise = isNoisePrinter(b.name, b.uri);
    if (aNoise !== bNoise) return aNoise ? 1 : -1;
    if (a.isDefault !== b.isDefault) return a.isDefault ? -1 : 1;
    return a.name.localeCompare(b.name);
  });

  const suggested =
    printers.find((p) => p.likelyThermal)?.name ??
    printers.find((p) => !isNoisePrinter(p.name, p.uri) && p.isDefault)?.name ??
    printers.find((p) => !isNoisePrinter(p.name, p.uri))?.name ??
    (printers.length === 1 ? printers[0].name : null);

  return { printers, suggested, defaultName };
}

/**
 * List CUPS queues from `lpstat -v` / `lpstat -d` (macOS / Linux).
 */
async function listCupsPrinters() {
  if (!LPSTAT_BIN) {
    throw new Error(
      "CUPS lpstat not found. On Linux install cups (`sudo apt install cups`). On macOS it is built-in.",
    );
  }
  const [devicesOut, defaultOut] = await Promise.all([
    runCmd(LPSTAT_BIN, ["-v"]),
    runCmd(LPSTAT_BIN, ["-d"]).catch(() => ""),
  ]);

  const defaultMatch = /system default destination:\s*(\S+)/i.exec(defaultOut);
  const defaultName = defaultMatch?.[1]?.trim() || null;

  const printers = [];
  for (const line of devicesOut.split("\n")) {
    const m = /^device for\s+(\S+):\s*(.*)$/i.exec(line.trim());
    if (!m) continue;
    const name = m[1];
    if (!UNIX_NAME_RE.test(name)) continue;
    const uri = (m[2] || "").trim();
    printers.push({
      name,
      uri,
      isDefault: Boolean(defaultName && name === defaultName),
      likelyThermal: isLikelyThermal(name, uri),
    });
  }

  return rankAndSuggest(printers, defaultName);
}

/**
 * List Windows printers via PowerShell.
 * Prefer Get-Printer; fall back to Win32_Printer (WMI) when Get-Printer is
 * missing/empty (common on locked-down or older Windows installs).
 */
async function listWindowsPrinters() {
  const ps = `
$ErrorActionPreference = 'Stop'
function Emit-PrinterJson($rows) {
  if (-not $rows -or $rows.Count -eq 0) { return '' }
  if ($rows.Count -eq 1) { return ($rows | ConvertTo-Json -Compress) }
  return ($rows | ConvertTo-Json -Compress)
}
$rows = @()
try {
  $rows = @(Get-Printer | Select-Object Name, PortName, DriverName, Default)
} catch {
  $rows = @()
}
if ($rows.Count -eq 0) {
  $rows = @(Get-CimInstance -ClassName Win32_Printer -ErrorAction SilentlyContinue |
    Select-Object Name, PortName, DriverName, @{n='Default';e={$_.Default}})
  if (-not $rows -or $rows.Count -eq 0) {
    $rows = @(Get-WmiObject -Class Win32_Printer -ErrorAction SilentlyContinue |
      Select-Object Name, PortName, DriverName, @{n='Default';e={$_.Default}})
  }
}
Emit-PrinterJson $rows
`.trim();

  let out;
  try {
    out = await runCmd("powershell.exe", [
      "-NoProfile",
      "-NonInteractive",
      "-ExecutionPolicy",
      "Bypass",
      "-Command",
      ps,
    ]);
  } catch (e) {
    throw new Error(
      e instanceof Error
        ? e.message
        : "PowerShell could not list printers. Is the Print Spooler running?",
    );
  }

  const trimmed = out.trim();
  if (!trimmed) {
    return rankAndSuggest([], null);
  }

  let parsed;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    throw new Error(
      "Could not parse Windows printer list from PowerShell. Try restarting the Print Spooler service.",
    );
  }
  const rows = Array.isArray(parsed) ? parsed : [parsed];

  const printers = [];
  let defaultName = null;
  for (const row of rows) {
    const name = String(row?.Name ?? "").trim();
    if (!name || !WIN_NAME_RE.test(name)) continue;
    const uri = String(row?.PortName ?? row?.DriverName ?? "").trim();
    const isDefault = Boolean(row?.Default);
    if (isDefault) defaultName = name;
    printers.push({
      name,
      uri,
      isDefault,
      likelyThermal: isLikelyThermal(name, uri),
    });
  }

  return rankAndSuggest(printers, defaultName);
}

async function listPrinters() {
  if (IS_WIN) return listWindowsPrinters();
  if (IS_UNIX) return listCupsPrinters();
  throw new Error(`Unsupported platform: ${PLATFORM}`);
}

function sendCups(name, data) {
  return new Promise((resolve, reject) => {
    if (!LP_BIN) {
      reject(
        new Error(
          "CUPS lp not found. On Linux install cups. On macOS it is built-in.",
        ),
      );
      return;
    }
    const file = join(tmpdir(), `palmart-escpos-${process.pid}-${Date.now()}.bin`);
    writeFile(file, data)
      .then(() => {
        const child = spawn(
          LP_BIN,
          [
            "-d",
            name,
            "-o",
            "raw",
            "-o",
            "document-format=application/vnd.cups-raw",
            file,
          ],
          { stdio: ["ignore", "pipe", "pipe"] },
        );
        let stderr = "";
        child.stderr.on("data", (c) => {
          stderr += c.toString();
        });
        child.on("error", reject);
        child.on("close", (code) => {
          unlink(file).catch(() => undefined);
          if (code === 0) resolve();
          else
            reject(
              new Error(
                stderr.trim() ||
                  `lp exited ${code} for queue "${name}" (check lpstat -v)`,
              ),
            );
        });
      })
      .catch(reject);
  });
}

/**
 * Send RAW bytes to a Windows printer via Win32 WritePrinter (PowerShell).
 */
async function sendWindowsRaw(name, data) {
  const file = join(
    tmpdir(),
    `palmart-escpos-${process.pid}-${Date.now()}.bin`,
  );
  await writeFile(file, data);

  // Escape for PowerShell single-quoted strings ('' = literal ')
  const qName = name.replace(/'/g, "''");
  const qFile = file.replace(/'/g, "''");

  const ps = `
$ErrorActionPreference = 'Stop'
Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
public class PalmartRawPrint {
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
$printer = '${qName}'
$path = '${qFile}'
$bytes = [System.IO.File]::ReadAllBytes($path)
$hPrinter = [IntPtr]::Zero
if (-not [PalmartRawPrint]::OpenPrinter($printer, [ref]$hPrinter, [IntPtr]::Zero)) {
  $err = [Runtime.InteropServices.Marshal]::GetLastWin32Error()
  throw "OpenPrinter failed for '$printer' (Win32 $err)"
}
try {
  $started = $false
  $lastErr = 0
  foreach ($dtype in @('RAW','TEXT',$null)) {
    $di = New-Object PalmartRawPrint+DOCINFO
    $di.pDocName = 'Palmart ESC/POS'
    $di.pOutputFile = $null
    $di.pDatatype = $dtype
    $di.cbSize = [System.Runtime.InteropServices.Marshal]::SizeOf($di)
    if ([PalmartRawPrint]::StartDocPrinter($hPrinter, 1, $di)) {
      $started = $true
      break
    }
    $lastErr = [Runtime.InteropServices.Marshal]::GetLastWin32Error()
  }
  if (-not $started) {
    throw ("StartDocPrinter failed for '$printer' (Win32 $lastErr). Reinstall the printer using Windows driver 'Generic / Text Only', set it Online, then Detect printers again.")
  }
  try {
    [void][PalmartRawPrint]::StartPagePrinter($hPrinter)
    $pinned = [System.Runtime.InteropServices.GCHandle]::Alloc($bytes, [System.Runtime.InteropServices.GCHandleType]::Pinned)
    try {
      $written = 0
      $ptr = $pinned.AddrOfPinnedObject()
      if (-not [PalmartRawPrint]::WritePrinter($hPrinter, $ptr, $bytes.Length, [ref]$written)) {
        $err = [Runtime.InteropServices.Marshal]::GetLastWin32Error()
        throw "WritePrinter failed (Win32 $err)"
      }
    } finally {
      $pinned.Free()
    }
    [void][PalmartRawPrint]::EndPagePrinter($hPrinter)
  } finally {
    [void][PalmartRawPrint]::EndDocPrinter($hPrinter)
  }
} finally {
  [void][PalmartRawPrint]::ClosePrinter($hPrinter)
}
`.trim();

  try {
    await runCmd("powershell.exe", [
      "-NoProfile",
      "-NonInteractive",
      "-ExecutionPolicy",
      "Bypass",
      "-Command",
      ps,
    ]);
  } catch (e) {
    throw new Error(
      e instanceof Error
        ? e.message
        : `Windows raw print failed for "${name}"`,
    );
  } finally {
    unlink(file).catch(() => undefined);
  }
}

function sendNetworkRaw(host, port, data) {
  return new Promise((resolve, reject) => {
    const socket = createConnection({ host, port }, () => {
      socket.write(data, (err) => {
        if (err) {
          socket.destroy();
          reject(err);
          return;
        }
        socket.end(() => resolve());
      });
    });
    socket.setTimeout(8_000, () => {
      socket.destroy();
      reject(new Error(`Timed out connecting to ${host}:${port}`));
    });
    socket.on("error", reject);
  });
}

async function sendRaw(name, data) {
  if (IS_WIN) return sendWindowsRaw(name, data);
  if (IS_UNIX) return sendCups(name, data);
  throw new Error(`Unsupported platform: ${PLATFORM}`);
}

function parsePort(raw) {
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 1 || n > 65535) return DEFAULT_RAW_PORT;
  return Math.trunc(n);
}

const server = createServer(async (req, res) => {
  if (req.method === "OPTIONS") {
    send(res, 204, "");
    return;
  }

  const url = req.url?.split("?")[0] ?? "/";

  if (req.method === "GET" && (url === "/health" || url === "/health/")) {
    send(
      res,
      200,
      {
        ok: true,
        platform: PLATFORM,
        cups: IS_UNIX ? Boolean(LP_BIN) : false,
        lpstat: IS_UNIX ? Boolean(LPSTAT_BIN) : false,
        spooler: IS_WIN,
        powershell: IS_WIN,
        networkRaw: true,
        port: PORT,
      },
      "application/json",
    );
    return;
  }

  if (req.method === "GET" && (url === "/printers" || url === "/printers/")) {
    try {
      const listed = await listPrinters();
      send(
        res,
        200,
        { ok: true, platform: PLATFORM, ...listed },
        "application/json",
      );
    } catch (e) {
      send(res, 502, e instanceof Error ? e.message : String(e));
    }
    return;
  }

  if (req.method === "POST" && (url === "/print" || url === "/print/")) {
    const netHost = req.headers["x-printer-host"]?.trim() || "";
    const netPort = parsePort(req.headers["x-printer-port"]);
    const cups = req.headers["x-printer-cups-name"]?.trim() || "";

    const body = await readRequest(req);
    if (body.length === 0) {
      send(res, 400, "empty body");
      return;
    }
    if (body.length > MAX_BODY) {
      send(res, 413, "payload too large");
      return;
    }

    try {
      if (netHost) {
        if (!HOST_RE.test(netHost)) {
          send(res, 400, "Invalid X-Printer-Host");
          return;
        }
        await sendNetworkRaw(netHost, netPort, body);
        send(
          res,
          200,
          JSON.stringify({
            ok: true,
            mode: "network",
            host: netHost,
            port: netPort,
          }),
          "application/json",
        );
        return;
      }

      if (!cups || !isValidPrinterName(cups)) {
        send(
          res,
          400,
          "Missing or invalid X-Printer-Cups-Name (set under Branches → Receipt details, or Detect printers)",
        );
        return;
      }

      await sendRaw(cups, body);
      send(
        res,
        200,
        JSON.stringify({
          ok: true,
          mode: IS_WIN ? "windows" : "cups",
          name: cups,
          platform: PLATFORM,
        }),
        "application/json",
      );
    } catch (e) {
      send(res, 502, e instanceof Error ? e.message : String(e));
    }
    return;
  }

  send(res, 404, "not found");
});

server.on("error", (err) => {
  if (err && err.code === "EADDRINUSE") {
    logLine(
      `Till Print Bridge already listening on http://${HOST}:${PORT} — exiting cleanly.`,
    );
    process.exit(0);
  }
  logLine("Till Print Bridge failed to start:", err instanceof Error ? err.message : err);
  process.exit(1);
});

server.listen(PORT, HOST, () => {
  logLine(`Till Print Bridge listening on http://${HOST}:${PORT}`);
  logLine(`Platform: ${PLATFORM}`);
  if (IS_UNIX) {
    logLine(`CUPS lp: ${LP_BIN ?? "NOT FOUND"}`);
    logLine(`CUPS lpstat: ${LPSTAT_BIN ?? "NOT FOUND"}`);
  } else if (IS_WIN) {
    logLine("Windows spooler: PowerShell Get-Printer / WritePrinter (RAW)");
  }
  logLine("Network ESC/POS: X-Printer-Host (+ optional X-Printer-Port, default 9100)");
  if (LOG_FILE) {
    logLine(`Logging to ${LOG_FILE}`);
  } else if (IS_WIN) {
    logLine("Installed via Windows installer? It runs hidden at logon — no console needed.");
  } else {
    logLine("Leave this process running while using cloud cashier (or use the OS installer / autostart).");
  }
});
