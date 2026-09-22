"use client";

import type { ReactNode } from "react";
import { ArrowLeft, X } from "lucide-react";

import { mizuSpringsFontVariables } from "@/components/storefront/templates/store/mizu-springs-fonts";
import styles from "@/components/storefront/templates/store/mizu-springs.module.css";
import { cn } from "@/lib/utils";

type Props = {
  onClose: () => void;
  children: ReactNode;
  className?: string;
  orderPlaced?: boolean;
  thankYou?: boolean;
};

/** Mizu Springs checkout drawer — navy rail, cyan secure hint, ice body. */
export function MizuSpringsCheckoutChrome({
  onClose,
  children,
  className,
  orderPlaced = false,
  thankYou = false,
}: Props) {
  const exitHint = thankYou
    ? "Back to the shop"
    : orderPlaced
      ? "Leave checkout — your order is saved"
      : "Close checkout";

  const title = thankYou
    ? "Thank you"
    : orderPlaced
      ? "Your order"
      : "Complete your order";

  return (
    <div
      className={cn(styles.checkoutShell, mizuSpringsFontVariables, className)}
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
          <p className={styles.checkoutEyebrow}>Secure checkout</p>
          <h2 className={styles.checkoutTitle}>{title}</h2>
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
