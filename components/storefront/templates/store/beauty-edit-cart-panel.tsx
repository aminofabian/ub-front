"use client";

import { X } from "lucide-react";

import { ShopCartPanelBody } from "@/components/storefront/shop-cart-panel-body";
import { beautyEditFontVariables } from "@/components/storefront/templates/store/beauty-edit-fonts";
import styles from "@/components/storefront/templates/store/beauty-edit.module.css";
import { useShopCart } from "@/hooks/use-shop-cart";
import { cn } from "@/lib/utils";

type Props = {
  onClose: () => void;
  compactHeader?: boolean;
  onExpand?: () => void;
  className?: string;
};

/** Beyond bag panel — ink rail, paper body, editorial type. */
export function BeautyEditCartPanel({
  onClose,
  compactHeader,
  onExpand,
  className,
}: Props) {
  const { itemCount, cartViewMode } = useShopCart();
  const focusMode = compactHeader && cartViewMode === "focus";

  return (
    <div className={cn(styles.cartShell, beautyEditFontVariables, className)}>
      <header className={styles.cartHead}>
        <div className={styles.cartHeadCopy}>
          <p className={styles.cartHeadTitle}>
            {focusMode ? "Added" : "Your bag"}
          </p>
          <p className={styles.cartHeadMeta}>
            {itemCount > 0
              ? `${itemCount} ${itemCount === 1 ? "piece" : "pieces"}`
              : "Empty for now"}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className={styles.cartCloseBtn}
          aria-label="Close bag"
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
