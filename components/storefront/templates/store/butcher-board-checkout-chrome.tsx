"use client";

import type { ReactNode } from "react";
import { ArrowLeft, X } from "lucide-react";

import { butcherBoardFontVariables } from "@/components/storefront/templates/store/butcher-board-fonts";
import styles from "@/components/storefront/templates/store/butcher-board.module.css";
import { cn } from "@/lib/utils";

type Props = {
  onClose: () => void;
  children: ReactNode;
  className?: string;
  orderPlaced?: boolean;
  thankYou?: boolean;
};

/** Butcher board checkout drawer — gold frame, crimson rail, billing type. */
export function ButcherBoardCheckoutChrome({
  onClose,
  children,
  className,
  orderPlaced = false,
  thankYou = false,
}: Props) {
  const exitHint = thankYou
    ? "Back to the board"
    : orderPlaced
      ? "Leave checkout — your order is saved"
      : "Close checkout";

  const title = thankYou
    ? "Thank you"
    : orderPlaced
      ? "Your order"
      : "Settle the slip";

  return (
    <div
      className={cn(styles.checkoutShell, butcherBoardFontVariables, className)}
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
          <p className={styles.checkoutEyebrow}>Pay at the board</p>
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
