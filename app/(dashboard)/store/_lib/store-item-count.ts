import type { StoreItemRecord } from "@/lib/api";

/** Whole numbers for a local register; inventory can be fractional. */
export function parseStoreCount(raw: string, wholeOnly: boolean): number | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const n = Number(trimmed);
  if (!Number.isFinite(n) || n < 0) return null;
  if (wholeOnly && !/^\d+$/.test(trimmed)) return null;
  return n;
}

/**
 * What the store room should show and let you type: live inventory while the
 * row follows a product, otherwise the local count.
 */
export function storeItemCount(
  row: StoreItemRecord,
  connected: boolean,
): number {
  if (connected && row.itemId != null) {
    const n = Number(row.inventoryQuantity ?? 0);
    return Number.isFinite(n) ? n : 0;
  }
  return row.quantity;
}

export function storeItemCountInput(value: number): string {
  if (!Number.isFinite(value)) return "0";
  return Number.isInteger(value) ? String(value) : String(Math.round(value * 10000) / 10000);
}
