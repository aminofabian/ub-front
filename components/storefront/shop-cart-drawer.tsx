"use client";

import { BlankDropCartPanel } from "@/components/storefront/templates/store/blank-drop-cart";
import { ComilmartCartPanel } from "@/components/storefront/templates/store/comilmart-cart-panel";
import { ShopCartMobileFloat } from "@/components/storefront/shop-cart-mobile-float";
import { ShopCartPanelBody } from "@/components/storefront/shop-cart-panel-body";
import { ShopSlideOver } from "@/components/storefront/shop-slide-over";
import { useMediaMd } from "@/hooks/use-media-md";
import { useShopCart } from "@/hooks/use-shop-cart";
import {
  isBlankDropStoreTheme,
  isComilmartStoreTheme,
} from "@/lib/storefront-theme-detect";

/**
 * After add-to-cart on desktop: compact floating card, then full drawer.
 * Mobile web skips the overlay and uses the cart dock instead.
 * Blank-drop and Comilmart use theme-specific bag panels.
 */
export function ShopCartDrawer() {
  const isMd = useMediaMd();
  const { drawerOpen, closeDrawer, cartViewMode } = useShopCart();
  const blankDrop = isBlankDropStoreTheme();
  const comilmart = isComilmartStoreTheme();

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

  if (comilmart) {
    if (!isMd || cartViewMode === "focus") {
      return <ShopCartMobileFloat themed="comilmart" />;
    }
    return (
      <ShopSlideOver
        variant="floating"
        open={drawerOpen}
        onClose={closeDrawer}
        ariaLabel="Your cart"
        className="cm-slide-over"
      >
        <ComilmartCartPanel onClose={closeDrawer} />
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
