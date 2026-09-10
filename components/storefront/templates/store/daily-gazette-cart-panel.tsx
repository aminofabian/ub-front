"use client";

import { X } from "lucide-react";

import { ShopCartPanelBody } from "@/components/storefront/shop-cart-panel-body";
import { dailyGazetteFontVariables } from "@/components/storefront/templates/store/daily-gazette-fonts";
import styles from "@/components/storefront/templates/store/daily-gazette.module.css";
import { useShopCart } from "@/hooks/use-shop-cart";
import { cn } from "@/lib/utils";

type Props = {
  onClose: () => void;
  compactHeader?: boolean;
  onExpand?: () => void;
  className?: string;
};

export function DailyGazetteCartPanel({
  onClose,
  compactHeader,
  onExpand,
  className,
}: Props) {
  const { itemCount, cartViewMode } = useShopCart();
  const focusMode = compactHeader && cartViewMode === "focus";

  return (
    <div
      className={cn(
        styles.cartShell,
        dailyGazetteFontVariables,
        className,
      )}
    >
      <header className={styles.cartHead}>
        <div className={styles.cartHeadCopy}>
          <p className={styles.cartHeadTitle}>
            {focusMode ? "Just in" : "Hold slip"}
          </p>
          <p className={styles.cartHeadMeta}>
            {itemCount > 0
              ? `${itemCount} ${itemCount === 1 ? "listing" : "listings"} at the desk`
              : "The desk is clear"}
          </p>
        </div>
        {itemCount > 0 ? (
          <span className={styles.cartStamp} aria-hidden>
            Hold
          </span>
        ) : null}
        <button
          type="button"
          onClick={onClose}
          className={styles.cartCloseBtn}
          aria-label="Close hold slip"
        >
          <X className="size-4" aria-hidden />
        </button>
      </header>
      <ShopCartPanelBody
        onClose={onClose}
        compactHeader={compactHeader}
        onExpand={onExpand}
        hideHeader
      />
    </div>
  );
}
