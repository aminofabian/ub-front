"use client";

import { ComilmartCartPanel } from "@/components/storefront/templates/store/comilmart-cart-panel";
import { ShopCartPanelBody } from "@/components/storefront/shop-cart-panel-body";
import styles from "@/components/storefront/templates/store/comilmart.module.css";
import { useMediaMd } from "@/hooks/use-media-md";
import { useShopCart } from "@/hooks/use-shop-cart";
import { cn } from "@/lib/utils";

/**
 * Compact floating cart card (mobile always; desktop after add-to-cart).
 * On desktop, clicking the card expands into the full slide-over drawer.
 */
export function ShopCartMobileFloat({
  themed,
}: {
  themed?: "comilmart";
} = {}) {
  const isMd = useMediaMd();
  const { drawerOpen, closeDrawer, showAllCartItems } = useShopCart();
  const comilmart = themed === "comilmart";

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
        className="absolute inset-0 bg-black/20 backdrop-blur-[3px] transition-opacity animate-in fade-in-0 duration-200"
        aria-label="Close cart"
        onClick={closeDrawer}
      />

      <div
        className={cn(
          comilmart
            ? cn(
                styles.cartFloat,
                isMd && "cursor-pointer",
              )
            : cn(
                "absolute flex max-h-[min(68dvh,28rem)] w-[min(calc(100vw-1.5rem),21rem)] flex-col overflow-hidden rounded-[6px] border border-[var(--storefront-card-border,#e2e5e2)] bg-[var(--storefront-paper-elevated,#fff)] shadow-[0_24px_56px_-16px_rgba(20,24,22,0.4)]",
                "origin-bottom-right animate-in fade-in-0 zoom-in-95 slide-in-from-bottom-3 duration-300",
                isMd
                  ? "bottom-6 right-6 cursor-pointer"
                  : "right-3 bottom-[calc(5.25rem+env(safe-area-inset-bottom))]",
              ),
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
        {comilmart ? (
          <ComilmartCartPanel
            onClose={closeDrawer}
            compactHeader
            onExpand={isMd ? expandToFullDrawer : undefined}
          />
        ) : (
          <ShopCartPanelBody
            onClose={closeDrawer}
            compactHeader
            onExpand={isMd ? expandToFullDrawer : undefined}
          />
        )}
      </div>
    </div>
  );
}
