"use client";

import { useEffect } from "react";

export const SHOP_CHECKOUT_DOCK_ID = "shop-checkout-floating-dock";
export const SHOP_CHECKOUT_DOCK_HEIGHT_VAR = "--shop-checkout-dock-height";

/** Keeps scroll padding in sync with the fixed bottom checkout dock. */
export function ShopCheckoutDockHeightSync() {
  useEffect(() => {
    const measure = () => {
      const el = document.getElementById(SHOP_CHECKOUT_DOCK_ID);
      if (!el) return;
      const height = Math.ceil(el.getBoundingClientRect().height);
      document.documentElement.style.setProperty(
        SHOP_CHECKOUT_DOCK_HEIGHT_VAR,
        `${height}px`,
      );
    };

    const el = document.getElementById(SHOP_CHECKOUT_DOCK_ID);
    if (!el) return;

    const observer = new ResizeObserver(measure);
    observer.observe(el);
    measure();
    const raf = requestAnimationFrame(measure);
    window.addEventListener("resize", measure);

    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
      window.removeEventListener("resize", measure);
      document.documentElement.style.removeProperty(SHOP_CHECKOUT_DOCK_HEIGHT_VAR);
    };
  }, []);

  return null;
}

/** Extra gap after scroll content (main clearance is scroll padding + dock CSS var). */
export function CheckoutScrollEndSpacer() {
  return (
    <div
      aria-hidden
      className="pointer-events-none h-4 shrink-0 max-lg:block lg:hidden"
    />
  );
}
