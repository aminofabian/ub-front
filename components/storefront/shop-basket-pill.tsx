"use client";

import Link from "next/link";
import { ShoppingBag } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { APP_ROUTES } from "@/lib/config";
import { formatDisplayPrice } from "@/lib/public-storefront";
import {
  WEB_CART_CHANGED_EVENT,
  clearWebCartHandle,
  fetchWebCart,
  readWebCartHandle,
} from "@/lib/web-cart";
import { cn } from "@/lib/utils";

export function ShopBasketPill({
  slug,
  accentHex,
}: {
  slug: string;
  accentHex?: string | null;
}) {
  const [lines, setLines] = useState(0);
  const [subtotal, setSubtotal] = useState<number | null>(null);
  const [currency, setCurrency] = useState("KES");

  const refresh = useCallback(async () => {
    const s = slug.trim();
    if (!s) {
      setLines(0);
      setSubtotal(null);
      return;
    }
    const h = readWebCartHandle();
    if (h?.slug !== s) {
      setLines(0);
      setSubtotal(null);
      return;
    }
    const cart = await fetchWebCart(s, h.cartId);
    if (!cart) {
      clearWebCartHandle();
      setLines(0);
      setSubtotal(null);
      return;
    }
    setLines(cart.lines.length);
    setSubtotal(cart.subtotal);
    setCurrency(cart.currency || "KES");
  }, [slug]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- async refresh
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

  const badge = lines > 0 ? lines : null;
  const accent =
    accentHex && /^#[0-9a-fA-F]{6}$/.test(accentHex.trim()) ? accentHex.trim() : null;
  const priceLabel =
    subtotal != null && Number.isFinite(subtotal)
      ? formatDisplayPrice(currency, subtotal)
      : null;

  return (
    <Link
      href={APP_ROUTES.shopCart}
      className="relative inline-flex items-center gap-2.5 text-sm transition hover:text-foreground"
      aria-label={badge ? `Basket, ${badge} items` : "Basket"}
    >
      <span className="relative flex h-10 w-10 items-center justify-center rounded-lg bg-muted/40 text-muted-foreground">
        <ShoppingBag className="h-5 w-5" aria-hidden />
        {badge != null ? (
          <span
            className={cn(
              "absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[11px] font-bold text-white shadow",
              !accent && "bg-primary",
            )}
            style={accent ? { backgroundColor: accent } : undefined}
          >
            {badge > 99 ? "99+" : badge}
          </span>
        ) : null}
      </span>
      <span className="hidden flex-col leading-tight sm:flex">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          My Basket
        </span>
        <span className="text-sm font-semibold tabular-nums text-foreground">
          {priceLabel ?? "—"}
        </span>
      </span>
    </Link>
  );
}
