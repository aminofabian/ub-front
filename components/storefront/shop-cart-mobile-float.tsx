"use client";

import { ShopCartPanelBody } from "@/components/storefront/shop-cart-panel-body";
import { useMediaMd } from "@/hooks/use-media-md";
import { useShopCart } from "@/hooks/use-shop-cart";
import { cn } from "@/lib/utils";

/**
 * Compact floating cart card (mobile always; desktop after add-to-cart).
 * On desktop, clicking the card expands into the full slide-over drawer.
 */
export function ShopCartMobileFloat() {
  const isMd = useMediaMd();
  const { drawerOpen, closeDrawer, showAllCartItems } = useShopCart();

  if (!drawerOpen) {
    return null;
  }

  function expandToFullDrawer() {
    if (!isMd) return;
    showAllCartItems();
  }

  return (
    <div className="fixed inset-0 z-50" role="presentation">
      <button
        type="button"
        className="absolute inset-0 bg-black/15 backdrop-blur-[2px] transition-opacity"
        aria-label="Close cart"
        onClick={closeDrawer}
      />

      <div
        className={cn(
          "absolute flex max-h-[min(68dvh,28rem)] w-[min(calc(100vw-1.5rem),20rem)] flex-col overflow-hidden rounded-2xl border border-border/70 bg-background/98 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.35)] ring-1 ring-black/[0.06] backdrop-blur-xl",
          "origin-bottom-right animate-in fade-in-0 zoom-in-95 slide-in-from-bottom-3 duration-300",
          isMd
            ? "bottom-6 right-6 cursor-pointer"
            : "right-3 bottom-[calc(5.25rem+env(safe-area-inset-bottom))]",
        )}
        role="dialog"
        aria-modal="true"
        aria-label={isMd ? "Your cart — click to open full cart" : "Your cart"}
        onClick={(e) => {
          if (!isMd) return;
          const target = e.target as HTMLElement | null;
          if (target?.closest("button, a, input, textarea, select")) return;
          expandToFullDrawer();
        }}
      >
        <ShopCartPanelBody
          onClose={closeDrawer}
          compactHeader
          onExpand={isMd ? expandToFullDrawer : undefined}
        />
      </div>
    </div>
  );
}
