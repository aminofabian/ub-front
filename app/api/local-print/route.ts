import { spawn } from "node:child_process";
import { createConnection } from "node:net";
import { NextResponse } from "next/server";

/** Feed past the cutter, then partial-cut variants most thermals honor. */
const CUT_TAIL = Buffer.from([
  0x1b, 0x64, 0x05, // ESC d 5 — feed 5 lines
  0x1d, 0x56, 0x42, 0x00, // GS V 66 0 — feed + partial cut
  0x1d, 0x56, 0x01, // GS V 1 — partial cut
]);

const MAX_BODY_BYTES = 256_000;

type PrinterTarget =
  | { mode: "network"; host: string; port: number }
  | { mode: "cups"; name: string };

function printerTarget(): PrinterTarget | null {
  const cups = process.env.RECEIPT_PRINTER_CUPS_NAME?.trim();
  if (cups) {
    return { mode: "cups", name: cups };
  }
  const host = process.env.RECEIPT_PRINTER_HOST?.trim();
  if (!host) return null;
  const port = Number(process.env.RECEIPT_PRINTER_PORT || 9100);
  if (!Number.isFinite(port) || port < 1 || port > 65535) return null;
  return { mode: "network", host, port };
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

/** Pass raw ESC/POS through CUPS so USB thermals get cut commands intact. */
function sendCups(name: string, data: Buffer): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn("lp", ["-d", name, "-o", "raw"], {
      stdio: ["pipe", "pipe", "pipe"],
    });
    let stderr = "";
    child.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
    });
    child.on("error", reject);
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
    child.stdin.write(data);
    child.stdin.end();
  });
}

/** Whether a receipt printer is configured for raw ESC/POS. */
export async function GET() {
  const target = printerTarget();
  if (!target) {
    return NextResponse.json({ configured: false });
  }
  if (target.mode === "cups") {
    return NextResponse.json({
      configured: true,
      mode: "cups",
      name: target.name,
    });
  }
  return NextResponse.json({
    configured: true,
    mode: "network",
    host: target.host,
    port: target.port,
  });
}

/**
 * Accept raw ESC/POS bytes and print them.
 * - RECEIPT_PRINTER_CUPS_NAME → USB/local via `lp -o raw` (e.g. Caysn_CN811_UB)
 * - RECEIPT_PRINTER_HOST → network TCP :9100
 */
export async function POST(request: Request) {
  const target = printerTarget();
  if (!target) {
    return NextResponse.json(
      {
        error:
          "No printer configured. Set RECEIPT_PRINTER_CUPS_NAME (USB, from `lpstat -v`) or RECEIPT_PRINTER_HOST (LAN IP) in frontend/.env.local and restart Next.js.",
      },
      { status: 503 },
    );
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
