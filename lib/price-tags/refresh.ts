import type { TagProduct } from "@/lib/price-tags/types";

/**
 * Reads one product for a tag. Resolves `null` when the product exists no
 * longer or cannot be sold; rejects when the read itself failed.
 */
export type TagProductLoader = (itemId: string) => Promise<TagProduct | null>;

export type RefreshOutcome = {
  /** Fresh rows for every id that loaded; ids that failed keep their old row. */
  products: Map<string, TagProduct>;
  /** Ids whose read failed even after a retry, so their price is not confirmed. */
  failed: string[];
  /** Ids that are gone or no longer sellable. */
  unavailable: string[];
  /** Ids whose selling price differs from the row already on the sheet. */
  changed: string[];
};

const DEFAULT_CONCURRENCY = 6;

async function loadWithRetry(load: TagProductLoader, itemId: string): Promise<TagProduct | null> {
  try {
    return await load(itemId);
  } catch {
    // One retry absorbs a dropped connection on shop Wi-Fi.
    return load(itemId);
  }
}

/** Re-read every product on the sheet so tags never print a stale price. */
export async function refreshTagProducts(
  itemIds: readonly string[],
  current: ReadonlyMap<string, TagProduct>,
  load: TagProductLoader,
  concurrency = DEFAULT_CONCURRENCY,
): Promise<RefreshOutcome> {
  const ids = Array.from(new Set(itemIds));
  const products = new Map(current);
  const failed: string[] = [];
  const unavailable: string[] = [];
  const changed: string[] = [];
  let cursor = 0;

  async function worker() {
    while (cursor < ids.length) {
      const id = ids[cursor];
      cursor += 1;
      try {
        const fresh = await loadWithRetry(load, id);
        if (!fresh) {
          unavailable.push(id);
          continue;
        }
        const before = current.get(id);
        if (before && before.sellingPrice !== fresh.sellingPrice) changed.push(id);
        products.set(id, fresh);
      } catch {
        failed.push(id);
      }
    }
  }

  const pool = Math.max(1, Math.min(concurrency, ids.length));
  await Promise.all(Array.from({ length: pool }, () => worker()));
  return { products, failed, unavailable, changed };
}
