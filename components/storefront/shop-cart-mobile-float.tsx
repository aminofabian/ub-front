"use client";

import { ComilmartCartPanel } from "@/components/storefront/templates/store/comilmart-cart-panel";
import { DailyGazetteCartPanel } from "@/components/storefront/templates/store/daily-gazette-cart-panel";
import { ShopCartPanelBody } from "@/components/storefront/shop-cart-panel-body";
import comilmartStyles from "@/components/storefront/templates/store/comilmart.module.css";
import gazetteStyles from "@/components/storefront/templates/store/daily-gazette.module.css";
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
  themed?: "comilmart" | "daily-gazette";
} = {}) {
  const isMd = useMediaMd();
  const { drawerOpen, closeDrawer, showAllCartItems } = useShopCart();
  const comilmart = themed === "comilmart";
  const gazette = themed === "daily-gazette";

  if (!drawerOpen) {
    return null;
  }

  function expandToFullDrawer() {
    if (!isMd) return;
    showAllCartItems();
  }

  const floatClass = comilmart
    ? cn(comilmartStyles.cartFloat, isMd && "cursor-pointer")
    : gazette
      ? cn(gazetteStyles.cartFloat, isMd && "cursor-pointer")
      : cn(
          "absolute flex max-h-[min(68dvh,28rem)] w-[min(calc(100vw-1.5rem),21rem)] flex-col overflow-hidden rounded-[6px] border border-[var(--storefront-card-border,#e2e5e2)] bg-[var(--storefront-paper-elevated,#fff)] shadow-[0_24px_56px_-16px_rgba(20,24,22,0.4)]",
          "origin-bottom-right animate-in fade-in-0 zoom-in-95 slide-in-from-bottom-3 duration-300",
          isMd
            ? "bottom-6 right-6 cursor-pointer"
            : "right-3 bottom-[calc(5.25rem+env(safe-area-inset-bottom))]",
        );

  const label = gazette
    ? isMd
      ? "Hold slip. Click to open the full slip"
      : "Hold slip"
    : isMd
      ? "Your cart — click to open full cart"
      : "Your cart";

  return (
    <div className="fixed inset-0 z-50" role="presentation">
      <button
        type="button"
        className="absolute inset-0 bg-black/20 backdrop-blur-[3px] transition-opacity animate-in fade-in-0 duration-200"
        aria-label={gazette ? "Close hold slip" : "Close cart"}
        onClick={closeDrawer}
      />

      <div
        className={floatClass}
        role="dialog"
        aria-modal="true"
        aria-label={label}
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
        ) : gazette ? (
          <DailyGazetteCartPanel
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
