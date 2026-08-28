"use client";

import { useEffect, useState } from "react";

import { fetchItemsPage } from "@/lib/api";
import {
  pickTryOnProducts,
  type ThemeTryOnProduct,
} from "@/lib/theme-try-on";

/**
 * Up to three real catalogue items for theme door phones. Empty on failure
 * or an empty shelf — never invents SKUs. Same fetch the atelier uses.
 */
export function useThemeTryOnProducts(options?: {
  currency?: string | null;
  enabled?: boolean;
}): ThemeTryOnProduct[] {
  const currency = options?.currency ?? "KES";
  const enabled = options?.enabled !== false;
  const [products, setProducts] = useState<ThemeTryOnProduct[]>([]);

  useEffect(() => {
    if (!enabled) {
      setProducts([]);
      return;
    }
    let cancelled = false;
    void fetchItemsPage(undefined, {
      catalogScope: "SKUS_ONLY",
      page: 0,
      size: 24,
    })
      .then((page) => {
        if (cancelled) return;
        setProducts(pickTryOnProducts(page.content, currency));
      })
      .catch(() => {
        if (cancelled) return;
        setProducts([]);
      });
    return () => {
      cancelled = true;
    };
  }, [currency, enabled]);

  return products;
}
