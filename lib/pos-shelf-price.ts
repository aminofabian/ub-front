"use client";

import {
  ApiRequestError,
  fetchCurrentSellingPrice,
  type CurrentSellingPriceRecord,
} from "@/lib/api";
import { pruneItemFromCatalogSearchCache } from "@/lib/catalog-search-cache";
import { isItemNotFoundProblem } from "@/lib/problem";
import { removeTopProduct } from "@/lib/top-products";

export type PosShelfPriceContext = {
  businessId?: string | null;
  /** Fired after local POS caches drop a missing catalog row. */
  onStaleItem?: (itemId: string) => void;
};

/**
 * Resolve shelf price for POS tiles/modals without surfacing expected "item gone" errors.
 * Prunes deleted items from browser-local frequent-item and search caches.
 */
export async function fetchPosShelfPrice(
  itemId: string,
  branchId: string | undefined,
  ctx: PosShelfPriceContext = {},
): Promise<CurrentSellingPriceRecord | null> {
  const id = itemId.trim();
  if (!id) {
    return null;
  }
  try {
    return await fetchCurrentSellingPrice(id, branchId, { toast: false });
  } catch (e) {
    if (e instanceof ApiRequestError && isItemNotFoundProblem(e.payload)) {
      removeTopProduct(ctx.businessId, id);
      pruneItemFromCatalogSearchCache(id);
      ctx.onStaleItem?.(id);
    }
    return null;
  }
}
