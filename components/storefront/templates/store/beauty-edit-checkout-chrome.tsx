"use client";

import type { ReactNode } from "react";
import { ArrowLeft, X } from "lucide-react";

import { beautyEditFontVariables } from "@/components/storefront/templates/store/beauty-edit-fonts";
import styles from "@/components/storefront/templates/store/beauty-edit.module.css";
import { cn } from "@/lib/utils";

type Props = {
  onClose: () => void;
  children: ReactNode;
  className?: string;
  orderPlaced?: boolean;
  thankYou?: boolean;
};

/** Beyond checkout drawer — ink header, paper body, sharp controls. */
export function BeautyEditCheckoutChrome({
  onClose,
  children,
  className,
  orderPlaced = false,
  thankYou = false,
}: Props) {
  const exitHint = thankYou
    ? "Back to the edit"
    : orderPlaced
      ? "Leave checkout — your order is saved"
      : "Close checkout";

  const title = thankYou
    ? "Thank you"
    : orderPlaced
      ? "Your order"
      : "Checkout";

  return (
    <div
      className={cn(styles.checkoutShell, beautyEditFontVariables, className)}
    >
      <header className={styles.checkoutHead}>
        <button
          type="button"
          onClick={onClose}
          className={styles.checkoutIconBtn}
          aria-label={exitHint}
          title={exitHint}
        >
          <ArrowLeft className="size-4" aria-hidden />
        </button>
        <div className={styles.checkoutHeadCopy}>
          <h2 className={styles.checkoutTitle}>{title}</h2>
          <p className={styles.checkoutMeta}>Pay securely with M-Pesa</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className={styles.checkoutIconBtn}
          aria-label={exitHint}
          title={exitHint}
        >
          <X className="size-4" aria-hidden />
        </button>
      </header>
      <div className={styles.checkoutBody}>{children}</div>
    </div>
  );
}
