"use client";

import { ShoppingBag } from "lucide-react";

import { useShopCart } from "@/hooks/use-shop-cart";
import { formatDisplayPrice } from "@/lib/public-storefront";
import { cn } from "@/lib/utils";

/**
 * Header cart control: live count, subtotal, opens slide-out drawer.
 */
export function ShopCartTrigger({
  accentHex,
  className,
  compact = false,
}: {
  accentHex?: string | null;
  className?: string;
  /** Icon-only control for tight mobile headers */
  compact?: boolean;
}) {
  const { itemCount, cart, loading, openDrawer } = useShopCart();
  const accent =
    accentHex && /^#[0-9a-fA-F]{6}$/.test(accentHex.trim()) ? accentHex.trim() : null;

  const priceLabel =
    cart?.subtotal != null && Number.isFinite(cart.subtotal)
      ? formatDisplayPrice(cart.currency, cart.subtotal)
      : null;

  return (
    <button
      type="button"
      onClick={openDrawer}
      className={cn(
        "group relative inline-flex items-center gap-2.5 rounded-xl text-sm transition-all duration-200 hover:bg-muted/50",
        compact ? "px-1 py-1" : "px-2 py-1.5",
        className,
      )}
      aria-label={
        itemCount > 0 ? `Cart, ${itemCount} items, ${priceLabel ?? ""}` : "Cart, empty"
      }
    >
      <span
        className={cn(
          "relative flex items-center justify-center rounded-xl bg-muted/40 text-muted-foreground transition-colors group-hover:bg-muted/70 group-hover:text-foreground",
          compact ? "size-10" : "h-10 w-10",
        )}
      >
        <ShoppingBag className="h-5 w-5" aria-hidden />
        {itemCount > 0 ? (
          <span
            className={cn(
              "absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[11px] font-bold text-white shadow-md",
              !accent && "bg-primary",
            )}
            style={accent ? { backgroundColor: accent } : undefined}
          >
            {loading ? "…" : itemCount > 99 ? "99+" : itemCount}
          </span>
        ) : null}
      </span>
      <span className="hidden flex-col leading-tight sm:flex">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          Cart
        </span>
        <span className="text-sm font-semibold tabular-nums text-foreground">
          {priceLabel ?? (itemCount > 0 ? "Updating…" : "Empty")}
        </span>
      </span>
    </button>
  );
}
