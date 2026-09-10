"use client";

import type { ReactNode } from "react";
import { ArrowLeft, X } from "lucide-react";

import { dailyGazetteFontVariables } from "@/components/storefront/templates/store/daily-gazette-fonts";
import styles from "@/components/storefront/templates/store/daily-gazette.module.css";
import { cn } from "@/lib/utils";

type Props = {
  onClose: () => void;
  children: ReactNode;
  className?: string;
  orderPlaced?: boolean;
  thankYou?: boolean;
};

export function DailyGazetteCheckoutChrome({
  onClose,
  children,
  className,
  orderPlaced = false,
  thankYou = false,
}: Props) {
  const exitHint = thankYou
    ? "Back to the shop"
    : orderPlaced
      ? "Leave checkout. Your order is saved"
      : "Close checkout";

  const title = thankYou
    ? "Held for press"
    : orderPlaced
      ? "Order filed"
      : "File this order";

  return (
    <div
      className={cn(
        styles.checkoutShell,
        dailyGazetteFontVariables,
        className,
      )}
    >
      <header className={styles.checkoutHead}>
        <button
          type="button"
          onClick={onClose}
          className={styles.cartCloseBtn}
          aria-label={exitHint}
          title={exitHint}
        >
          <ArrowLeft className="size-4" aria-hidden />
        </button>
        <div className={styles.cartHeadCopy}>
          <h2 className={styles.checkoutTitle}>{title}</h2>
          <p className={styles.cartHeadMeta}>
            {thankYou
              ? "The desk has your receipt"
              : orderPlaced
                ? "Paid and on the spike"
                : "Circulation desk"}
          </p>
        </div>
        <span className={styles.cartStamp} aria-hidden>
          {thankYou ? "Filed" : "File"}
        </span>
        <button
          type="button"
          onClick={onClose}
          className={styles.cartCloseBtn}
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
