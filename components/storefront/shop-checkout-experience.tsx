"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import ShopCheckoutForm from "@/components/storefront/shop-checkout-form";
import { ShopCheckoutDrawerChrome } from "@/components/storefront/shop-checkout-drawer-chrome";
import { ShopSlideOver } from "@/components/storefront/shop-slide-over";
import { BlankDropCheckout } from "@/components/storefront/templates/store/blank-drop-checkout";
import { ComilmartCheckoutChrome } from "@/components/storefront/templates/store/comilmart-checkout-chrome";
import { useShopCartOptional } from "@/hooks/use-shop-cart";
import { useMediaMd } from "@/hooks/use-media-md";
import { APP_ROUTES } from "@/lib/config";
import {
  isBlankDropStoreTheme,
  isComilmartStoreTheme,
} from "@/lib/storefront-theme-detect";

type Props = {
  slug: string;
  /** Drawer from cart vs dedicated `/shop/checkout` route */
  mode: "drawer" | "page";
};

export function ShopCheckoutExperience({ slug, mode }: Props) {
  const isMd = useMediaMd();
  const router = useRouter();
  const cart = useShopCartOptional();
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [thankYou, setThankYou] = useState(false);
  const blankDrop = isBlankDropStoreTheme();
  const comilmart = isComilmartStoreTheme();

  const onClose = () => {
    if (mode === "drawer") {
      cart?.closeCheckout();
      return;
    }
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
      return;
    }
    router.push(APP_ROUTES.shop);
  };

  if (blankDrop && mode === "page") {
    return <BlankDropCheckout slug={slug} />;
  }

  const form = (
    <ShopCheckoutForm
      slug={slug}
      embedded={isMd}
      onOrderPlacedChange={setOrderPlaced}
      onThankYouChange={setThankYou}
    />
  );

  if (blankDrop && mode === "drawer") {
    const open = Boolean(cart?.checkoutOpen);
    if (!open) return null;
    return (
      <ShopSlideOver
        variant="panel"
        open={open}
        onClose={onClose}
        ariaLabel="Checkout"
        zIndex={74}
      >
        <BlankDropCheckout slug={slug} />
      </ShopSlideOver>
    );
  }

  if (!isMd) {
    return (
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">{form}</div>
    );
  }

  const open = mode === "drawer" ? Boolean(cart?.checkoutOpen) : true;

  if (mode === "drawer" && !open) {
    return null;
  }

  const CheckoutChrome = comilmart
    ? ComilmartCheckoutChrome
    : ShopCheckoutDrawerChrome;

  return (
    <ShopSlideOver
      variant="panel"
      open={open}
      onClose={onClose}
      ariaLabel="Checkout"
      zIndex={74}
      className={comilmart ? "cm-slide-over" : undefined}
    >
      <CheckoutChrome
        onClose={onClose}
        orderPlaced={orderPlaced}
        thankYou={thankYou}
      >
        {form}
      </CheckoutChrome>
    </ShopSlideOver>
  );
}
