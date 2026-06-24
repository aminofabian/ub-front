/** Normalized string for unit-price inputs (empty when missing / invalid). */
export function shelfPriceToInputString(raw: number | string | null | undefined): string {
  if (raw == null) return "";
  const n = typeof raw === "string" ? Number(raw) : raw;
  if (!Number.isFinite(n) || n < 0) return "";
  const rounded = Math.round(n * 100) / 100;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(2);
}

/** Display label under thumbnails, e.g. `199.00 USD` when {@code currency} is non-empty; otherwise amount only. */
export function formatShelfPriceLabel(
  raw: number | string | null | undefined,
  currency: string,
): string | null {
  const s = shelfPriceToInputString(raw);
  if (!s) return null;
  const c = currency.trim();
  return c ? `${s} ${c}` : s;
}

/**
 * Split a compact shelf string like `199.00 KES` into amount + ISO code.
 * Non-matching lines (loading copy, dashes, etc.) return {@code code: null}.
 */
export function splitShelfPriceDisplay(line: string): { amount: string; code: string | null } {
  const t = line.trim();
  if (!t) return { amount: line, code: null };
  const m = t.match(/^([\d][\d.,]*)\s+([A-Za-z]{3})$/);
  if (m) {
    return { amount: m[1], code: m[2].toUpperCase() };
  }
  return { amount: line, code: null };
}
