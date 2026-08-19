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
  const [regularPrice, setRegularPrice] = useState<number | null>(null);
  const [savedAmount, setSavedAmount] = useState<number | null>(null);
  const [discountName, setDiscountName] = useState<string | null>(null);

  useEffect(() => {
    setPrice(initialPrice);
    setRegularPrice(null);
    setSavedAmount(null);
    setDiscountName(null);
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
      setRegularPrice((current) =>
        current === detail.regularPrice ? current : (detail.regularPrice ?? null),
      );
      setSavedAmount((current) =>
        current === detail.savedAmount ? current : (detail.savedAmount ?? null),
      );
      setDiscountName((current) =>
        current === detail.discountName ? current : (detail.discountName ?? null),
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

  const hasDiscount =
    Boolean(discountName) &&
    regularPrice != null &&
    price != null &&
    regularPrice !== price &&
    savedAmount != null &&
    savedAmount > 0;

  return (
    <span className={className}>
      {hasDiscount ? (
        <>
          <span className="mr-2 line-through text-[var(--storefront-ink-muted,#5c6560)]">
            {formatDisplayPrice(currency, regularPrice)}
          </span>
          {formatDisplayPrice(currency, price)}
          <span className="ml-2 text-[11px] font-semibold text-[var(--storefront-ink-muted,#5c6560)]">
            Save {formatDisplayPrice(currency, savedAmount)}
          </span>
        </>
      ) : (
        formatDisplayPrice(currency, price)
      )}
    </span>
  );
}
