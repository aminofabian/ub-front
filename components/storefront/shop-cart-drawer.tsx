"use client";

import { BlankDropCartPanel } from "@/components/storefront/templates/store/blank-drop-cart";
import { ShopCartMobileFloat } from "@/components/storefront/shop-cart-mobile-float";
import { ShopCartPanelBody } from "@/components/storefront/shop-cart-panel-body";
import { ShopSlideOver } from "@/components/storefront/shop-slide-over";
import { useMediaMd } from "@/hooks/use-media-md";
import { useShopCart } from "@/hooks/use-shop-cart";

function isBlankDropTheme(): boolean {
  if (typeof document === "undefined") return false;
  return Boolean(document.querySelector('[data-store-theme-id="blank-drop"]'));
}

/**
 * After add-to-cart on desktop: compact floating card, then full drawer.
 * Mobile web skips the overlay and uses the cart dock instead.
 * Blank-drop uses a utilitarian full-panel bag on every viewport.
 */
export function ShopCartDrawer() {
  const isMd = useMediaMd();
  const { drawerOpen, closeDrawer, cartViewMode } = useShopCart();
  const blankDrop = isBlankDropTheme();

  if (!drawerOpen) {
    return null;
  }

  if (blankDrop) {
    return (
      <ShopSlideOver
        variant="panel"
        open={drawerOpen}
        onClose={closeDrawer}
        ariaLabel="Bag"
      >
        <BlankDropCartPanel onClose={closeDrawer} />
      </ShopSlideOver>
    );
  }

  if (!isMd || cartViewMode === "focus") {
    return <ShopCartMobileFloat />;
  }

  return (
    <ShopSlideOver
      variant="floating"
      open={drawerOpen}
      onClose={closeDrawer}
      ariaLabel="Your cart"
    >
      <ShopCartPanelBody onClose={closeDrawer} />
    </ShopSlideOver>
  );
}
