import type { GlobalProductRecord } from "@/lib/api";

/** Longer text (a QR code with a web address, say) is not a product barcode. */
const MAX_CODE_LENGTH = 64;

/** GTIN-8, -12, -13 and -14 are one number, padded with zeros. */
const GTIN_LENGTHS = [8, 12, 13, 14];

function isDigits(value: string): boolean {
  return /^\d+$/.test(value);
}

/** What the camera read, trimmed — "" when it cannot be a barcode. */
export function normalizeScannedCode(raw: string): string {
  const code = raw.trim();
  return code.length > 0 && code.length <= MAX_CODE_LENGTH ? code : "";
}

/**
 * The same number whether a label prints it as UPC-A, EAN-13 or GTIN-14. Compare
 * these keys, not the raw text: a catalogue that stores 0012345678905 must still
 * match a camera that reads 012345678905.
 */
export function barcodeKey(code: string): string {
  const c = code.trim();
  return isDigits(c) && GTIN_LENGTHS.includes(c.length) ? c.padStart(14, "0") : c;
}

/**
 * Spellings worth asking the catalogue about: the scan as read, plus its UPC-A /
 * EAN-13 twin (12 digits ↔ the same digits with a leading zero).
 */
export function barcodeVariants(code: string): string[] {
  const out = [code];
  if (isDigits(code)) {
    if (code.length === 12) out.push(`0${code}`);
    else if (code.length === 13 && code.startsWith("0")) out.push(code.slice(1));
  }
  return out;
}

/** What one scan means for the shared-catalogue page. */
export type CatalogScanDecision =
  /** One importable product has this barcode: add it to the import. */
  | { kind: "select"; product: GlobalProductRecord }
  /** …and it is already in the import. */
  | { kind: "already-selected"; product: GlobalProductRecord }
  /** The shop already has it (`itemId` is the shop's own product, when known). */
  | { kind: "in-shop"; product: GlobalProductRecord; itemId: string | null }
  /** Several importable products share this barcode — the clerk must choose. */
  | { kind: "pick"; products: GlobalProductRecord[] }
  /** The catalogue does not know this barcode. */
  | { kind: "not-found"; code: string };

/**
 * Decide what a scan does, given the catalogue's answer. Only rows that really
 * carry the scanned barcode count — a lookup can also return name or SKU matches.
 */
export function decideScan(input: {
  code: string;
  rows: GlobalProductRecord[];
  isSelected: (productId: string) => boolean;
}): CatalogScanDecision {
  const key = barcodeKey(input.code);
  const exact = input.rows.filter(
    (row) => Boolean(row.barcode?.trim()) && barcodeKey(row.barcode ?? "") === key,
  );
  if (exact.length === 0) return { kind: "not-found", code: input.code };

  const importable = exact.filter((row) => !row.alreadyImported);
  if (importable.length === 0) {
    const owned = exact.find((row) => row.adoptedItemId?.trim()) ?? exact[0];
    return {
      kind: "in-shop",
      product: owned,
      itemId: owned.adoptedItemId?.trim() || null,
    };
  }
  if (importable.length === 1) {
    const only = importable[0];
    return input.isSelected(only.id)
      ? { kind: "already-selected", product: only }
      : { kind: "select", product: only };
  }
  return { kind: "pick", products: importable };
}
