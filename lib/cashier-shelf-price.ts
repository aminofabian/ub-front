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
  if (raw == null) return null;
  const n = typeof raw === "string" ? Number(raw) : raw;
  if (!Number.isFinite(n) || n < 0) return null;
  // Always two decimals on POS badges so 450.00 and 3.90 read consistently.
  const s = (Math.round(n * 100) / 100).toFixed(2);
  const c = currency.trim();
  return c ? `${s} ${c}` : s;
}

/**
 * Split a compact shelf string like `199.00 KES` into amount + ISO code.
 * Prefersthe last amount+currency pair so accidental unit prefixes
 * (e.g. `1 kg 435 KES` or `1kg / 435 KES`) never leak into the badge.
 * Returns only a numeric amount — never raw unit text.
 */
export function splitShelfPriceDisplay(line: string): { amount: string; code: string | null } {
  const t = line.trim();
  if (!t) return { amount: "", code: null };
  const withCode = [...t.matchAll(/([\d][\d.,]*)\s+([A-Za-z]{3})\b/g)];
  const lastCoded = withCode[withCode.length - 1];
  if (lastCoded) {
    return { amount: lastCoded[1], code: lastCoded[2].toUpperCase() };
  }
  // Strip leading size/unit clutter ("1kg /", "500ml ·") then take the last number.
  const stripped = t
    .replace(/^\d+(?:\.\d+)?\s*(?:kg|g|ml|l|pcs?|pk)\b/i, "")
    .replace(/^[·/\-|]+\s*/, "")
    .trim();
  const nums = [...stripped.matchAll(/([\d][\d.,]*)/g)];
  const lastNum = nums[nums.length - 1]?.[1];
  if (lastNum) {
    return { amount: lastNum, code: null };
  }
  const amountOnly = t.match(/^([\d][\d.,]*)$/);
  if (amountOnly) {
    return { amount: amountOnly[1], code: null };
  }
  return { amount: "", code: null };
}
