"use client";

import type { ReactNode } from "react";
import { ArrowLeft, X } from "lucide-react";

import { zetuFontVariables } from "@/app/fonts/zetu";
import styles from "@/components/storefront/templates/store/zetu.module.css";
import { cn } from "@/lib/utils";

type Props = {
  onClose: () => void;
  children: ReactNode;
  className?: string;
  orderPlaced?: boolean;
  thankYou?: boolean;
};

/** Zetu checkout drawer — black rail, lime eyebrow, paper body. */
export function ZetuCheckoutChrome({
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
    <div className={cn(styles.checkoutShell, zetuFontVariables, className)}>
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
