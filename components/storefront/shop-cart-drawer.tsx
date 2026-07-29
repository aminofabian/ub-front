"use client";

import { ShopCartMobileFloat } from "@/components/storefront/shop-cart-mobile-float";
import { ShopCartPanelBody } from "@/components/storefront/shop-cart-panel-body";
import { ShopSlideOver } from "@/components/storefront/shop-slide-over";
import { useMediaMd } from "@/hooks/use-media-md";
import { useShopCart } from "@/hooks/use-shop-cart";

function ShopCartDesktopDrawer() {
  const { drawerOpen, closeDrawer } = useShopCart();

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

/**
 * After add-to-cart: compact floating card (all breakpoints).
 * Full slide-over drawer: desktop only, after the user expands the float
 * (or opens cart from the header).
 */
export function ShopCartDrawer() {
  const isMd = useMediaMd();
  const { drawerOpen, cartViewMode } = useShopCart();

  if (!drawerOpen) {
    return null;
  }

  if (!isMd || cartViewMode === "focus") {
    return <ShopCartMobileFloat />;
  }

  return <ShopCartDesktopDrawer />;
}
