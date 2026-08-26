"use client";

import ShopCheckoutForm from "@/components/storefront/shop-checkout-form";
import { blankDropFontVariables } from "@/components/storefront/templates/store/blank-drop-fonts";
import styles from "@/components/storefront/templates/store/blank-drop.module.css";
import { cn } from "@/lib/utils";

/**
 * Checkout page skin for blank-drop — mono, uppercase, zero-radius fields.
 */
export function BlankDropCheckout({ slug }: { slug: string }) {
  return (
    <div
      className={cn(styles.root, blankDropFontVariables, styles.checkout)}
      data-store-theme-id="blank-drop"
    >
      <div className={styles.checkoutWrap}>
        <h1 className={styles.checkoutTitle}>Checkout</h1>
        <ShopCheckoutForm slug={slug} embedded />
      </div>
    </div>
  );
}
