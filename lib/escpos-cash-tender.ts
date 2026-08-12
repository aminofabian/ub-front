/** Feed + partial cut — must match ReceiptEscPosRenderer on the Java API. */
const CUT_TAIL = new Uint8Array([0x1b, 0x64, 0x08, 0x1d, 0x56, 0x01]);

/**
 * ESC/POS drawer pulse — pin 2 then pin 5 (covers both RJ12 wirings).
 * Matches desktop `devices.rs` DRAWER_KICK for pin 2.
 */
export const DRAWER_KICK_ESCPOS = new Uint8Array([
  0x1b, 0x70, 0x00, 0x19, 0xfa, // pin 2
  0x1b, 0x70, 0x01, 0x19, 0xfa, // pin 5
]);

function escPosCharWidth(widthMm: number): number {
  if (widthMm <= 50) return 28;
  if (widthMm <= 58) return 32;
  return 48;
}

function padLeft(text: string, width: number): string {
  if (text.length >= width) return text.slice(-width);
  return " ".repeat(width - text.length) + text;
}

export type CashTenderEscPos = {
  received: number;
  change: number;
};

/** True when thermal bytes already include Received / Change lines. */
export function escPosHasCashTender(bytes: Uint8Array): boolean {
  const text = new TextDecoder("ascii", { fatal: false }).decode(bytes);
  return text.includes("Received ") && text.includes("Change ");
}

/** True when bytes already end with a drawer kick pulse. */
export function escPosHasDrawerKick(bytes: Uint8Array): boolean {
  if (bytes.length < 5) return false;
  // ESC p …
  for (let i = 0; i <= bytes.length - 5; i++) {
    if (
      bytes[i] === 0x1b &&
      bytes[i + 1] === 0x70 &&
      (bytes[i + 2] === 0x00 || bytes[i + 2] === 0x01)
    ) {
      return true;
    }
  }
  return false;
}

/** Append cash-drawer kick after the receipt (idempotent). */
export function appendDrawerKickEscPos(bytes: Uint8Array): Uint8Array {
  if (escPosHasDrawerKick(bytes)) {
    return bytes;
  }
  const out = new Uint8Array(bytes.length + DRAWER_KICK_ESCPOS.length);
  out.set(bytes);
  out.set(DRAWER_KICK_ESCPOS, bytes.length);
  return out;
}

/**
 * Insert Received / Change before the cutter when the API receipt omitted them
 * (e.g. backend not yet storing cash_received).
 */
export function appendCashTenderEscPos(
  bytes: Uint8Array,
  tender: CashTenderEscPos,
  widthMm: number,
): Uint8Array {
  if (escPosHasCashTender(bytes)) {
    return bytes;
  }
  const received = Number(tender.received);
  const change = Number(tender.change);
  if (!Number.isFinite(received) || received <= 0) {
    return bytes;
  }

  const w = escPosCharWidth(widthMm);
  const lines =
    `${padLeft(`Received ${received.toFixed(2)}`, w)}\n` +
    `${padLeft(`Change ${change.toFixed(2)}`, w)}\n`;
  const extra = new TextEncoder().encode(lines);

  let body = bytes;
  if (bytes.length >= CUT_TAIL.length) {
    const tail = bytes.subarray(bytes.length - CUT_TAIL.length);
    let match = true;
    for (let i = 0; i < CUT_TAIL.length; i++) {
      if (tail[i] !== CUT_TAIL[i]) {
        match = false;
        break;
      }
    }
    if (match) {
      body = bytes.subarray(0, bytes.length - CUT_TAIL.length);
    }
  }

  const out = new Uint8Array(body.length + extra.length + CUT_TAIL.length);
  out.set(body);
  out.set(extra, body.length);
  out.set(CUT_TAIL, body.length + extra.length);
  return out;
}
