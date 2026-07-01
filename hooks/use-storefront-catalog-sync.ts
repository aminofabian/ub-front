"use client";

import {
  useEffect,
  useRef,
  type Dispatch,
  type SetStateAction,
} from "react";

import {
  fetchStorefrontItemPricePatches,
  type StorefrontItemPricePatch,
} from "@/lib/public-storefront-client";
import type { PublicCatalogItemCard } from "@/lib/public-storefront";
import { subscribeStorefrontPriceRefresh } from "@/lib/storefront-price-events";

export const STOREFRONT_CATALOG_POLL_MS = 10_000;

function priceChanged(
  current: number | null,
  next: number | null,
): boolean {
  if (current == null && next == null) {
    return false;
  }
  if (current == null || next == null) {
    return true;
  }
  return Math.abs(current - next) >= 0.005;
}

function applyPricePatches(
  items: PublicCatalogItemCard[],
  patches: Map<string, StorefrontItemPricePatch>,
): PublicCatalogItemCard[] | null {
  if (patches.size === 0) {
    return null;
  }

  let changed = false;
  const next = items.map((item) => {
    const patch = patches.get(item.id);
    if (!patch) {
      return item;
    }
    if (
      !priceChanged(item.price, patch.price) &&
      item.qtyOnHand === patch.qtyOnHand
    ) {
      return item;
    }
    changed = true;
    return {
      ...item,
      price: patch.price,
      qtyOnHand: patch.qtyOnHand,
    };
  });
  return changed ? next : null;
}

export function useStorefrontCatalogSync({
  slug,
  q,
  categoryId,
  typeId,
  departmentId,
  items,
  setItems,
  enabled = true,
  pollMs = STOREFRONT_CATALOG_POLL_MS,
}: {
  slug: string;
  q?: string;
  categoryId?: string;
  typeId?: string;
  /** @deprecated Use {@link typeId}. */
  departmentId?: string;
  items: PublicCatalogItemCard[];
  setItems: Dispatch<SetStateAction<PublicCatalogItemCard[]>>;
  enabled?: boolean;
  pollMs?: number;
}): void {
  const resolvedTypeId = typeId?.trim() || departmentId?.trim() || undefined;
  const setItemsRef = useRef(setItems);
  const itemsRef = useRef(items);
  setItemsRef.current = setItems;
  itemsRef.current = items;

  useEffect(() => {
    if (!enabled || !slug.trim()) {
      return;
    }

    let cancelled = false;

    const refresh = async (targetItemIds?: string[]) => {
      if (typeof document !== "undefined" && document.hidden) {
        return;
      }
      const snapshot = itemsRef.current;
      const ids =
        targetItemIds && targetItemIds.length > 0
          ? targetItemIds
          : snapshot.map((item) => item.id);
      if (ids.length === 0) {
        return;
      }

      const patches = await fetchStorefrontItemPricePatches(slug, ids, {
        q,
        categoryId,
        typeId: resolvedTypeId,
      });
      if (cancelled || patches.size === 0) {
        return;
      }

      setItemsRef.current((prev) => applyPricePatches(prev, patches) ?? prev);
    };

    const timer = window.setInterval(() => {
      void refresh();
    }, pollMs);
    void refresh();

    const onVisible = () => {
      if (!document.hidden) {
        void refresh();
      }
    };
    document.addEventListener("visibilitychange", onVisible);

    const unsubscribe = subscribeStorefrontPriceRefresh((itemIds) => {
      void refresh(itemIds);
    });

    return () => {
      cancelled = true;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
      unsubscribe();
    };
  }, [slug, q, categoryId, resolvedTypeId, enabled, pollMs]);
}
