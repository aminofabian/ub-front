"use client";

import { useEffect, useState } from "react";

import {
  loadThemeSampleItems,
  pickTryOnProducts,
  type ThemeTryOnProduct,
} from "@/lib/theme-try-on";

/**
 * Up to three real catalogue items for theme door phones. Empty on failure
 * or an empty shelf — never invents SKUs. Shares the atelier's sample fetch.
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
    void loadThemeSampleItems()
      .then((items) => {
        if (cancelled) return;
        setProducts(pickTryOnProducts(items, currency));
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
