/**
 * Purchase-order and goods-receipt slips sent to one cashier till.
 * Bytes are built on the till so the order desk never needs a local printer.
 */

export type TillSlipKind = "order" | "receipt";

export type TillSlipLine = {
  name: string;
  qty: number;
  unitCost: number;
  lineTotal: number;
};

export type TillSlip = {
  reference: string;
  supplierName?: string | null;
  businessName?: string | null;
  branchName?: string | null;
  placedByName?: string | null;
  currency?: string | null;
  lines: TillSlipLine[];
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

function asNumber(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}

function formatQty(n: number): string {
  if (!Number.isFinite(n)) return "0";
  const rounded = Math.round(n * 1000) / 1000;
  return Number.isInteger(rounded) ? String(rounded) : String(rounded);
}

export function buildTillSlipEscPos(slip: TillSlip, kind: TillSlipKind, widthMm = 80): Uint8Array {
  const w = escPosCharWidth(widthMm);
  const currency = strip(slip.currency || "KES") || "KES";
  const heading = kind === "receipt" ? "GOODS RECEIPT" : "PURCHASE ORDER";
  const out: string[] = [];

  if (slip.businessName?.trim()) {
    out.push(center(strip(slip.businessName), w));
  }
  if (slip.branchName?.trim()) {
    out.push(center(strip(slip.branchName), w));
  }
  out.push(repeat("-", w));
  out.push(center(heading, w));
  out.push(center(strip(slip.reference), w));
  out.push(center(strip(new Date().toLocaleString("en-KE")), w));
  if (slip.placedByName?.trim()) {
    out.push(center(strip(slip.placedByName), w));
  }
  if (slip.supplierName?.trim()) {
    out.push(repeat("-", w));
    out.push(center(`Supplier: ${strip(slip.supplierName)}`, w));
  }
  out.push(repeat("-", w));

  let grand = 0;
  for (const line of slip.lines) {
    const name = strip(line.name) || "Item";
    for (const row of wrap(name, w)) out.push(row);
    const unitCost = asNumber(line.unitCost);
    const lineTotal = asNumber(line.lineTotal);
    const qty = asNumber(line.qty);
    grand += lineTotal;
    const detail = `${formatQty(qty)} x ${unitCost.toFixed(2)} = ${lineTotal.toFixed(2)}`;
    out.push(padLeft(strip(detail), w));
  }

  out.push(repeat("-", w));
  out.push(padLeft(`TOTAL ${grand.toFixed(2)} ${currency}`, w));
  out.push(repeat("-", w));
  out.push(
    center(kind === "receipt" ? "Received into stock" : "Place with supplier", w),
  );

  const encoder = new TextEncoder();
  const bodyParts = out.map((line) => encoder.encode(`${line}\n`));
  let bodyLen = 0;
  for (const p of bodyParts) bodyLen += p.length;

  const bytes = new Uint8Array(INIT.length + bodyLen + CUT_TAIL.length);
  let offset = 0;
  bytes.set(INIT, offset);
  offset += INIT.length;
  for (const p of bodyParts) {
    bytes.set(p, offset);
    offset += p.length;
  }
  bytes.set(CUT_TAIL, offset);
  return bytes;
}

export function readStoredCashierIds(storageKey: string): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((id): id is string => typeof id === "string" && id.trim().length > 0);
  } catch {
    return [];
  }
}

export function writeStoredCashierIds(storageKey: string, ids: string[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(storageKey, JSON.stringify(ids));
  } catch {
    // private mode / quota
  }
}
