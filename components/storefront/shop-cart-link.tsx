"use client";

import Link from "next/link";
import { ShoppingBag } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { APP_ROUTES } from "@/lib/config";
import {
  WEB_CART_CHANGED_EVENT,
  clearWebCartHandle,
  fetchWebCart,
  readWebCartHandle,
} from "@/lib/web-cart";

export default function ShopCartLink({
  slug,
  accentColor,
}: {
  slug: string;
  /** Tenant primary; used for hover ring when set. */
  accentColor?: string | null;
}) {
  const [lineCount, setLineCount] = useState(0);

  const refresh = useCallback(async () => {
    await Promise.resolve();
    const s = slug.trim();
    let next = 0;
    if (s) {
      const h = readWebCartHandle();
      if (h?.slug === s) {
        const cart = await fetchWebCart(s, h.cartId);
        if (!cart) {
          clearWebCartHandle();
        } else {
          next = cart.lines.length;
        }
      }
    }
    setLineCount(next);
  }, [slug]);

  useEffect(() => {
     
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const onChange = () => void refresh();
    window.addEventListener(WEB_CART_CHANGED_EVENT, onChange);
    window.addEventListener("focus", onChange);
    return () => {
      window.removeEventListener(WEB_CART_CHANGED_EVENT, onChange);
      window.removeEventListener("focus", onChange);
    };
  }, [refresh]);

  const badge = lineCount > 0 ? lineCount : null;

  const accentHex =
    accentColor && /^#[0-9a-fA-F]{6}$/.test(accentColor.trim()) ? accentColor.trim() : null;

  return (
    <Link
      href={APP_ROUTES.shopCart}
      className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-border/60 bg-card/50 text-muted-foreground shadow-sm transition hover:border-primary/35 hover:bg-muted/40 hover:text-foreground hover:shadow-md"
      aria-label={badge ? `Cart, ${badge} items` : "Cart"}
    >
      <ShoppingBag className="h-5 w-5" aria-hidden />
      {badge != null ? (
        <span
          className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground shadow-sm"
          style={accentHex ? { backgroundColor: accentHex, color: "#fff" } : undefined}
        >
          {badge > 99 ? "99+" : badge}
        </span>
      ) : null}
    </Link>
  );
}
