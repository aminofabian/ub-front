/**
 * Client-built ESC/POS slip for a department-counter invoice (GI-*).
 * Printed via the same Till Print Bridge as cashier receipts.
 */

import type { GroceryInvoiceResponse } from "@/lib/grocery-api";

export type GroceryInvoiceReceiptSnapshot = {
  businessName: string;
  branchName?: string | null;
  departmentLabel?: string | null;
  createdByName?: string | null;
  currency: string;
  invoice: GroceryInvoiceResponse;
  customerName?: string | null;
};

const CUT_TAIL = new Uint8Array([0x1b, 0x64, 0x08, 0x1d, 0x56, 0x01]);
const INIT = new Uint8Array([0x1b, 0x40]);

function escPosCharWidth(widthMm: number): number {
  if (widthMm <= 50) return 28;
  if (widthMm <= 58) return 32;
  return 48;
}

function strip(s: string): string {
  return s
    .normalize("NFKD")
    .replace(/[^\x20-\x7E]/g, "")
    .trim();
}

function repeat(ch: string, n: number): string {
  return ch.repeat(Math.max(0, n));
}

function padLeft(text: string, width: number): string {
  if (text.length >= width) return text.slice(-width);
  return " ".repeat(width - text.length) + text;
}

function center(text: string, width: number): string {
  if (text.length >= width) return text.slice(0, width);
  const pad = width - text.length;
  const left = Math.floor(pad / 2);
  return " ".repeat(left) + text + " ".repeat(pad - left);
}

function wrap(text: string, width: number): string[] {
  const t = text.trim();
  if (!t) return [];
  if (t.length <= width) return [t];
  const out: string[] = [];
  let rest = t;
  while (rest.length > width) {
    let cut = rest.lastIndexOf(" ", width);
    if (cut <= 0) cut = width;
    out.push(rest.slice(0, cut).trimEnd());
    rest = rest.slice(cut).trimStart();
  }
  if (rest) out.push(rest);
  return out;
}

function formatQty(n: number): string {
  if (!Number.isFinite(n)) return "0";
  const rounded = Math.round(n * 1000) / 1000;
  return Number.isInteger(rounded) ? String(rounded) : String(rounded);
}

function encodeLines(lines: string[]): Uint8Array {
  const joined = lines.map((l) => `${l}\n`).join("");
  const bytes = new Uint8Array(joined.length);
  for (let i = 0; i < joined.length; i++) {
    bytes[i] = joined.charCodeAt(i) & 0xff;
  }
  return bytes;
}

/** Epson-compatible CODE128 (GS k 73) with HRI below. */
function code128EscPos(payload: string): Uint8Array {
  const data = strip(payload);
  if (!data) return new Uint8Array(0);
  // Code set B prefix `{B` then ASCII payload.
  const body = `{B${data}`;
  const out = new Uint8Array(10 + body.length);
  let i = 0;
  out[i++] = 0x1d;
  out[i++] = 0x68;
  out[i++] = 0x50; // height
  out[i++] = 0x1d;
  out[i++] = 0x48;
  out[i++] = 0x02; // HRI below
  out[i++] = 0x1d;
  out[i++] = 0x6b;
  out[i++] = 73; // CODE128
  out[i++] = body.length;
  for (let j = 0; j < body.length; j++) {
    out[i++] = body.charCodeAt(j) & 0xff;
  }
  return out;
}

function concat(...parts: Uint8Array[]): Uint8Array {
  const total = parts.reduce((n, p) => n + p.length, 0);
  const out = new Uint8Array(total);
  let off = 0;
  for (const p of parts) {
    out.set(p, off);
    off += p.length;
  }
  return out;
}

export function buildGroceryInvoiceEscPos(
  snapshot: GroceryInvoiceReceiptSnapshot,
  widthMm = 80,
): Uint8Array {
  const w = escPosCharWidth(widthMm);
  const currency = strip(snapshot.currency || "KES") || "KES";
  const inv = snapshot.invoice;
  const out: string[] = [];

  if (snapshot.businessName?.trim()) {
    out.push(center(strip(snapshot.businessName), w));
  }
  if (snapshot.branchName?.trim()) {
    out.push(center(strip(snapshot.branchName), w));
  }
  out.push(repeat("-", w));
  out.push(center("DEPARTMENT INVOICE", w));
  if (snapshot.departmentLabel?.trim()) {
    out.push(center(strip(snapshot.departmentLabel), w));
  }
  out.push(center(strip(inv.barcodeCode), w));
  out.push(center(strip(new Date(inv.createdAt || Date.now()).toLocaleString("en-KE")), w));
  if (snapshot.createdByName?.trim()) {
    out.push(center(strip(snapshot.createdByName), w));
  }
  if (snapshot.customerName?.trim()) {
    out.push(center(`Customer: ${strip(snapshot.customerName)}`, w));
  }
  out.push(repeat("-", w));

  for (const line of inv.lines ?? []) {
    const name = strip(line.itemName) || "Item";
    for (const row of wrap(name, w)) out.push(row);
    const qty = Number(line.quantity);
    const unit = Number(line.unitPrice);
    const total = Number(line.lineTotal);
    const detail = `${formatQty(qty)} x ${unit.toFixed(2)} = ${total.toFixed(2)}`;
    out.push(padLeft(strip(detail), w));
  }

  out.push(repeat("-", w));
  const grand = Number(inv.grandTotal);
  out.push(
    padLeft(
      strip(`TOTAL ${currency} ${Number.isFinite(grand) ? grand.toFixed(2) : "0.00"}`),
      w,
    ),
  );
  out.push(repeat("-", w));
  out.push(center("Pay at cashier", w));
  out.push(center("Scan barcode below", w));
  out.push("");

  const textBytes = encodeLines(out);
  const barcode = code128EscPos(inv.barcodeCode);
  const lf = new Uint8Array([0x0a, 0x0a]);
  return concat(INIT, textBytes, barcode, lf, CUT_TAIL);
}

export function groceryInvoiceReceiptFromResponse(opts: {
  businessName: string;
  branchName?: string | null;
  departmentLabel?: string | null;
  createdByName?: string | null;
  currency: string;
  invoice: GroceryInvoiceResponse;
  customerName?: string | null;
}): GroceryInvoiceReceiptSnapshot {
  return {
    businessName: opts.businessName,
    branchName: opts.branchName,
    departmentLabel: opts.departmentLabel,
    createdByName: opts.createdByName,
    currency: opts.currency,
    invoice: opts.invoice,
    customerName: opts.customerName,
  };
}
