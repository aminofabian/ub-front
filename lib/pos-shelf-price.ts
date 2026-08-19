"use client";

import {
  ApiRequestError,
  fetchResolvedPrice,
  type CurrentSellingPriceRecord,
  type ResolvedPriceRecord,
} from "@/lib/api";
import { pruneItemFromCatalogSearchCache } from "@/lib/catalog-search-cache";
import { isItemNotFoundProblem } from "@/lib/problem";
import { removeTopProduct } from "@/lib/top-products";

export type PosShelfPriceContext = {
  businessId?: string | null;
  /** Fired after local POS caches drop a missing catalog row. */
  onStaleItem?: (itemId: string) => void;
};

export type PosShelfPriceResult = CurrentSellingPriceRecord & {
  regularPrice?: number | string | null;
  discountName?: string | null;
  savedAmount?: number | string | null;
};

/**
 * Resolve shelf price for POS tiles/modals without surfacing expected "item gone" errors.
 * Uses catalog discount overlay when active (final price), keeping regular price for display.
 */
export async function fetchPosShelfPrice(
  itemId: string,
  branchId: string | undefined,
  ctx: PosShelfPriceContext = {},
): Promise<PosShelfPriceResult | null> {
  const id = itemId.trim();
  if (!id) {
    return null;
  }
  try {
    const resolved: ResolvedPriceRecord = await fetchResolvedPrice(id, branchId, {
      toast: false,
    });
    return {
      price: resolved.finalPrice,
      regularPrice: resolved.regularPrice,
      discountName: resolved.discount?.name ?? null,
      savedAmount: resolved.savedAmount,
    };
  } catch (e) {
    if (e instanceof ApiRequestError && isItemNotFoundProblem(e.payload)) {
      removeTopProduct(ctx.businessId, id);
      pruneItemFromCatalogSearchCache(id);
      ctx.onStaleItem?.(id);
    }
    return null;
  }
}
