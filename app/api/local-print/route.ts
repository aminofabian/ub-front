import { createConnection } from "node:net";
import { NextResponse } from "next/server";

/** Feed past the cutter, then partial-cut variants most thermals honor. */
const CUT_TAIL = Buffer.from([
  0x1b, 0x64, 0x05, // ESC d 5 — feed 5 lines
  0x1d, 0x56, 0x42, 0x00, // GS V 66 0 — feed + partial cut
  0x1d, 0x56, 0x01, // GS V 1 — partial cut
]);

const MAX_BODY_BYTES = 256_000;

function printerTarget(): { host: string; port: number } | null {
  const host = process.env.RECEIPT_PRINTER_HOST?.trim();
  if (!host) return null;
  const port = Number(process.env.RECEIPT_PRINTER_PORT || 9100);
  if (!Number.isFinite(port) || port < 1 || port > 65535) return null;
  return { host, port };
}

function sendRaw(host: string, port: number, data: Buffer): Promise<void> {
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

/** Whether a LAN thermal printer is configured for raw ESC/POS. */
export async function GET() {
  const target = printerTarget();
  if (!target) {
    return NextResponse.json({ configured: false });
  }
  return NextResponse.json({
    configured: true,
    host: target.host,
    port: target.port,
  });
}

/**
 * Accept raw ESC/POS bytes and write them to RECEIPT_PRINTER_HOST:PORT (default 9100).
 * Used by cloud/dev cashier when the desktop device bridge is not available.
 */
export async function POST(request: Request) {
  const target = printerTarget();
  if (!target) {
    return NextResponse.json(
      {
        error:
          "RECEIPT_PRINTER_HOST is not set. Add the printer LAN IP to frontend/.env.local and restart Next.js.",
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
    await sendRaw(target.host, target.port, payload);
  } catch (e) {
    const message =
      e instanceof Error
        ? e.message
        : `Could not reach printer at ${target.host}:${target.port}`;
    return NextResponse.json({ error: message }, { status: 502 });
  }

  return NextResponse.json({
    ok: true,
    bytes: payload.length,
    host: target.host,
    port: target.port,
  });
}
