import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { unlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createConnection } from "node:net";
import { NextResponse } from "next/server";

/**
 * Cut sequence proven on Caysn CN811-UB via `lp -o raw`:
 * feed past the blade, then GS V 1 (partial cut).
 */
const CUT_TAIL = Buffer.from([
  0x1b, 0x64, 0x08, // ESC d 8 — feed 8 lines
  0x1d, 0x56, 0x01, // GS V 1 — partial cut
]);

const MAX_BODY_BYTES = 256_000;
const CUPS_NAME_RE = /^[A-Za-z0-9._-]+$/;

/** Absolute paths — Next/IDE often has a PATH without /usr/bin (spawn lp → ENOENT). */
const LP_BIN = existsSync("/usr/bin/lp") ? "/usr/bin/lp" : "lp";
const LPSTAT_BIN = existsSync("/usr/bin/lpstat") ? "/usr/bin/lpstat" : "lpstat";
const CUPS_PATH = [process.env.PATH, "/usr/bin", "/bin", "/usr/sbin"]
  .filter(Boolean)
  .join(":");

type PrinterTarget =
  | { mode: "network"; host: string; port: number }
  | { mode: "cups"; name: string };

function envFallbackTarget(): PrinterTarget | null {
  const cups = process.env.RECEIPT_PRINTER_CUPS_NAME?.trim();
  if (cups && CUPS_NAME_RE.test(cups)) {
    return { mode: "cups", name: cups };
  }
  const host = process.env.RECEIPT_PRINTER_HOST?.trim();
  if (!host) return null;
  const port = Number(process.env.RECEIPT_PRINTER_PORT || 9100);
  if (!Number.isFinite(port) || port < 1 || port > 65535) return null;
  return { mode: "network", host, port };
}

function targetFromRequest(request: Request): PrinterTarget | null {
  const cups = request.headers.get("x-printer-cups-name")?.trim();
  if (cups) {
    if (!CUPS_NAME_RE.test(cups)) {
      return null;
    }
    return { mode: "cups", name: cups };
  }
  const host = request.headers.get("x-printer-host")?.trim();
  if (host) {
    const port = Number(request.headers.get("x-printer-port") || 9100);
    if (!Number.isFinite(port) || port < 1 || port > 65535) return null;
    return { mode: "network", host, port };
  }
  return envFallbackTarget();
}

function listCupsPrinters(): Promise<string[]> {
  return new Promise((resolve) => {
    const child = spawn(LPSTAT_BIN, ["-a"], {
      stdio: ["ignore", "pipe", "pipe"],
      env: { ...process.env, PATH: CUPS_PATH },
    });
    let stdout = "";
    child.stdout.on("data", (chunk: Buffer) => {
      stdout += chunk.toString();
    });
    child.on("error", () => resolve([]));
    child.on("close", () => {
      const names = stdout
        .split("\n")
        .map((line) => line.trim().split(/\s+/)[0])
        .filter((name) => Boolean(name) && CUPS_NAME_RE.test(name));
      resolve(names);
    });
  });
}

function sendNetwork(host: string, port: number, data: Buffer): Promise<void> {
  return new Promise((resolve, reject) => {
    const socket = createConnection({ host, port }, () => {
      socket.write(data, (writeErr) => {
        if (writeErr) {
          socket.destroy();
          reject(writeErr);
          return;
        }
        socket.end(() => resolve());
      });
    });
    socket.setTimeout(10_000, () => {
      socket.destroy();
      reject(new Error(`Printer at ${host}:${port} timed out`));
    });
    socket.on("error", reject);
  });
}

function formatSpawnError(err: unknown, bin: string): Error {
  if (err && typeof err === "object" && "code" in err && err.code === "ENOENT") {
    return new Error(
      `Could not find ${bin}. Is CUPS installed? (expected /usr/bin/lp)`,
    );
  }
  return err instanceof Error ? err : new Error(String(err));
}

function sendCups(name: string, data: Buffer): Promise<void> {
  const file = join(tmpdir(), `palmart-escpos-${process.pid}-${Date.now()}.bin`);
  return writeFile(file, data)
    .then(
      () =>
        new Promise<void>((resolve, reject) => {
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
            {
              stdio: ["ignore", "pipe", "pipe"],
              env: { ...process.env, PATH: CUPS_PATH },
            },
          );
          let stderr = "";
          child.stderr.on("data", (chunk: Buffer) => {
            stderr += chunk.toString();
          });
          child.on("error", (err) => reject(formatSpawnError(err, LP_BIN)));
          child.on("close", (code) => {
            if (code === 0) {
              resolve();
              return;
            }
            reject(
              new Error(
                stderr.trim() ||
                  `lp exited ${code}. Is printer "${name}" installed? (lpstat -v)`,
              ),
            );
          });
        }),
    )
    .finally(() => {
      void unlink(file).catch(() => undefined);
    });
}

/** Local print capability + CUPS queues visible on this machine. */
export async function GET() {
  const cupsPrinters = await listCupsPrinters();
  const fallback = envFallbackTarget();
  return NextResponse.json({
    available: true,
    cupsPrinters,
    envFallback: fallback
      ? fallback.mode === "cups"
        ? { mode: "cups", name: fallback.name }
        : { mode: "network", host: fallback.host, port: fallback.port }
      : null,
  });
}

/**
 * Accept raw ESC/POS bytes and print them.
 * Prefer per-request headers from branch settings:
 *   X-Printer-Cups-Name: Caysn_CN811_UB
 *   X-Printer-Host / X-Printer-Port: network raw :9100
 * Env RECEIPT_PRINTER_* remains an optional fallback.
 */
export async function POST(request: Request) {
  const target = targetFromRequest(request);
  if (!target) {
    return NextResponse.json(
      {
        error:
          "No printer specified. Set the CUPS name under Branches → Receipt details (or pass X-Printer-Cups-Name).",
      },
      { status: 503 },
    );
  }
  if (target.mode === "cups" && !CUPS_NAME_RE.test(target.name)) {
    return NextResponse.json({ error: "Invalid CUPS printer name" }, { status: 400 });
  }

  const body = Buffer.from(await request.arrayBuffer());
  if (body.length === 0) {
    return NextResponse.json({ error: "empty body" }, { status: 400 });
  }
  if (body.length > MAX_BODY_BYTES) {
    return NextResponse.json({ error: "payload too large" }, { status: 413 });
  }

  const payload = Buffer.concat([body, CUT_TAIL]);

  try {
    if (target.mode === "cups") {
      await sendCups(target.name, payload);
    } else {
      await sendNetwork(target.host, target.port, payload);
    }
  } catch (e) {
    const message =
      e instanceof Error ? e.message : "Could not reach the receipt printer";
    return NextResponse.json({ error: message }, { status: 502 });
  }

  return NextResponse.json({
    ok: true,
    bytes: payload.length,
    ...(target.mode === "cups"
      ? { mode: "cups", name: target.name }
      : { mode: "network", host: target.host, port: target.port }),
  });
}
