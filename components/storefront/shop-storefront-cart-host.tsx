"use client";

import { ChevronDown, ShoppingBag } from "lucide-react";
import type { ReactNode } from "react";

import { ShopCartDrawer } from "@/components/storefront/shop-cart-drawer";
import { ShopCartProvider, useShopCart } from "@/hooks/use-shop-cart";
import { formatDisplayPrice } from "@/lib/public-storefront";
import { cn } from "@/lib/utils";

function FloatingCartButton({ accentHex }: { accentHex?: string | null }) {
  const { itemCount, cart, drawerOpen, toggleDrawer, loading } = useShopCart();
  const accent =
    accentHex && /^#[0-9a-fA-F]{6}$/.test(accentHex.trim()) ? accentHex.trim() : null;

  if (itemCount === 0 && !loading) {
    return null;
  }

  const subtotal =
    cart?.subtotal != null
      ? formatDisplayPrice(cart.currency, cart.subtotal)
      : null;

  return (
    <button
      type="button"
      onClick={toggleDrawer}
      className={cn(
        "fixed bottom-[calc(1.25rem+env(safe-area-inset-bottom))] right-4 z-[60] flex items-center gap-2.5 rounded-full border py-2.5 pl-3 pr-4 shadow-lg backdrop-blur-md transition-all duration-300 active:scale-[0.98] lg:hidden",
        drawerOpen
          ? "border-primary/30 bg-background shadow-xl ring-2 ring-primary/20"
          : "border-border/80 bg-background/95 shadow-black/10 ring-1 ring-black/[0.04] hover:scale-[1.02]",
      )}
      aria-label={drawerOpen ? "Close cart" : `Open cart, ${itemCount} items`}
      aria-expanded={drawerOpen}
    >
      <span
        className={cn(
          "relative flex size-10 items-center justify-center rounded-full text-white shadow-md",
          !accent && "bg-primary",
        )}
        style={accent ? { backgroundColor: accent } : undefined}
      >
        <ShoppingBag className="size-5" aria-hidden />
        <span className="absolute -right-0.5 -top-0.5 flex size-5 min-w-5 items-center justify-center rounded-full bg-foreground px-1 text-[10px] font-bold text-background">
          {itemCount > 99 ? "99+" : itemCount}
        </span>
      </span>
      {subtotal ? (
        <span className="flex flex-col items-start leading-tight">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            {drawerOpen ? "Close" : "Cart"}
          </span>
          <span className="text-sm font-bold tabular-nums">{subtotal}</span>
        </span>
      ) : null}
      {drawerOpen ? (
        <ChevronDown className="size-4 shrink-0 text-muted-foreground" aria-hidden />
      ) : null}
    </button>
  );
}

/**
 * Client cart layer: shared state, slide-out drawer, mobile floating preview.
 */
export function ShopStorefrontCartHost({
  slug,
  accentHex,
  children,
}: {
  slug: string;
  accentHex?: string | null;
  children: ReactNode;
}) {
  return (
    <ShopCartProvider slug={slug}>
      {children}
      <ShopCartDrawer />
      <FloatingCartButton accentHex={accentHex} />
    </ShopCartProvider>
  );
}
