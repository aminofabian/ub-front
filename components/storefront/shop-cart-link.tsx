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

export default function ShopCartLink({ slug }: { slug: string }) {
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
    // eslint-disable-next-line react-hooks/set-state-in-effect -- refresh is async; state updates run after I/O
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

  return (
    <Link
      href={APP_ROUTES.shopCart}
      className="relative flex h-10 w-10 items-center justify-center rounded-lg border border-border/60 text-muted-foreground transition hover:border-primary/40 hover:text-foreground"
      aria-label={badge ? `Cart, ${badge} items` : "Cart"}
    >
      <ShoppingBag className="h-5 w-5" aria-hidden />
      {badge != null ? (
        <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
          {badge > 99 ? "99+" : badge}
        </span>
      ) : null}
    </Link>
  );
}
