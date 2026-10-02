"use client";

import {
  ApiRequestError,
  fetchResolvedPrice,
  fetchResolvedPrices,
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

function toPosShelfPriceResult(
  resolved: ResolvedPriceRecord,
): PosShelfPriceResult {
  return {
    price: resolved.finalPrice,
    regularPrice: resolved.regularPrice,
    discountName: resolved.discount?.name ?? null,
    savedAmount: resolved.savedAmount,
  };
}

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
    return toPosShelfPriceResult(resolved);
  } catch (e) {
    if (e instanceof ApiRequestError && isItemNotFoundProblem(e.payload)) {
      removeTopProduct(ctx.businessId, id);
      pruneItemFromCatalogSearchCache(id);
      ctx.onStaleItem?.(id);
    }
    return null;
  }
}

/**
 * Batch resolve shelf prices for many POS tiles in one (or few) round-trips.
 * Missing / errored ids are omitted from the result map.
 */
export async function fetchPosShelfPrices(
  itemIds: readonly string[],
  branchId: string | undefined,
  ctx: PosShelfPriceContext = {},
): Promise<Record<string, PosShelfPriceResult>> {
  const ids = Array.from(
    new Set(
      itemIds
        .map((id) => id.trim())
        .filter((id) => id.length > 0),
    ),
  );
  if (ids.length === 0) {
    return {};
  }
  try {
    const resolved = await fetchResolvedPrices(ids, branchId, { toast: false });
    const out: Record<string, PosShelfPriceResult> = {};
    for (const id of ids) {
      const row = resolved[id];
      if (!row) continue;
      // No final price and no regular → treat as missing shelf price (empty tile).
      if (row.finalPrice == null && row.regularPrice == null) continue;
      out[id] = toPosShelfPriceResult(row);
    }
    return out;
  } catch (e) {
    // Batch failed (e.g. older backend without the endpoint) — fall back per-id
    // only for a small set so we never reintroduce a 100+ storm on partial outages.
    if (ids.length > 24) {
      return {};
    }
    const out: Record<string, PosShelfPriceResult> = {};
    await Promise.all(
      ids.map(async (id) => {
        const r = await fetchPosShelfPrice(id, branchId, ctx);
        if (r) out[id] = r;
      }),
    );
    return out;
  }
}
