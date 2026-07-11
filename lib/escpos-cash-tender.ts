/** Feed + partial cut — must match ReceiptEscPosRenderer on the Java API. */
const CUT_TAIL = new Uint8Array([0x1b, 0x64, 0x08, 0x1d, 0x56, 0x01]);

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
