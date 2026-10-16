/** Code 128 shelf labels accept a short printable product code. */
export const MAX_CODE_LENGTH = 80;

/** Longer than this still encodes, but the label gets wide to scan. */
export const LONG_CODE_LENGTH = 32;

export const EXAMPLE_CODE = "KIOSK-001";

const FILE_SLUG_LENGTH = 40;
const PRINTABLE_ASCII = /^[\x20-\x7E]+$/;

export type BarcodeCodeState = "empty" | "ready" | "long" | "invalid" | "too-long";

export function assessBarcodeCode(raw: string): { code: string; state: BarcodeCodeState } {
  const code = raw.trim();
  if (code.length === 0) return { code, state: "empty" };
  if (code.length > MAX_CODE_LENGTH) return { code, state: "too-long" };
  if (!PRINTABLE_ASCII.test(code)) return { code, state: "invalid" };
  if (code.length > LONG_CODE_LENGTH) return { code, state: "long" };
  return { code, state: "ready" };
}

export function canEncodeBarcode(state: BarcodeCodeState): boolean {
  return state === "ready" || state === "long";
}

export function barcodeFileName(code: string): string {
  const slug = code
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, FILE_SLUG_LENGTH)
    .replace(/-+$/g, "");

  return `kiosk-${slug || "barcode"}.svg`;
}
