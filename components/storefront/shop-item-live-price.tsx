"use client";

import { useEffect, useState } from "react";

import { fetchPublicItemDetailBrowser } from "@/lib/public-storefront-client";
import { formatDisplayPrice } from "@/lib/public-storefront";
import { STOREFRONT_CATALOG_POLL_MS } from "@/hooks/use-storefront-catalog-sync";
import { subscribeStorefrontPriceRefresh } from "@/lib/storefront-price-events";

export function ShopItemLivePrice({
  slug,
  itemId,
  currency,
  initialPrice,
  className,
}: {
  slug: string;
  itemId: string;
  currency: string;
  initialPrice: number | null;
  className?: string;
}) {
  const [price, setPrice] = useState(initialPrice);

  useEffect(() => {
    setPrice(initialPrice);
  }, [itemId, initialPrice]);

  useEffect(() => {
    if (!slug.trim() || !itemId.trim()) {
      return;
    }

    let cancelled = false;

    const tick = async () => {
      const detail = await fetchPublicItemDetailBrowser(slug, itemId);
      if (cancelled || !detail) {
        return;
      }
      setPrice((current) =>
        current === detail.price ? current : detail.price,
      );
    };

    const timer = window.setInterval(() => {
      void tick();
    }, STOREFRONT_CATALOG_POLL_MS);
    void tick();

    const unsubscribe = subscribeStorefrontPriceRefresh((itemIds) => {
      if (itemIds && !itemIds.includes(itemId)) {
        return;
      }
      void tick();
    });

    return () => {
      cancelled = true;
      window.clearInterval(timer);
      unsubscribe();
    };
  }, [slug, itemId]);

  return (
    <span className={className}>{formatDisplayPrice(currency, price)}</span>
  );
}
