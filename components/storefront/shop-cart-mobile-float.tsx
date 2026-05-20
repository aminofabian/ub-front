"use client";

import { ShopCartPanelBody } from "@/components/storefront/shop-cart-panel-body";
import { useShopCart } from "@/hooks/use-shop-cart";
import { cn } from "@/lib/utils";

/**
 * Mobile cart UI: compact floating card above the FAB (not a full-screen drawer).
 */
export function ShopCartMobileFloat() {
  const { drawerOpen, closeDrawer } = useShopCart();

  if (!drawerOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 lg:hidden" role="presentation">
      <button
        type="button"
        className="absolute inset-0 bg-black/15 backdrop-blur-[2px] transition-opacity"
        aria-label="Close cart"
        onClick={closeDrawer}
      />

      <div
        className={cn(
          "absolute right-3 flex max-h-[min(68dvh,28rem)] w-[min(calc(100vw-1.5rem),20rem)] flex-col overflow-hidden rounded-2xl border border-border/70 bg-background/98 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.35)] ring-1 ring-black/[0.06] backdrop-blur-xl",
          "bottom-[calc(5.25rem+env(safe-area-inset-bottom))]",
          "origin-bottom-right animate-in fade-in-0 zoom-in-95 slide-in-from-bottom-3 duration-300",
        )}
        role="dialog"
        aria-modal="true"
        aria-label="Your cart"
      >
        <ShopCartPanelBody onClose={closeDrawer} compactHeader />
      </div>
    </div>
  );
}
