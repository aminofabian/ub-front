"use client";

import { useEffect, useId, useRef } from "react";

import { milkRunFontVariables } from "@/components/storefront/templates/store/milk-run-fonts";
import styles from "@/components/storefront/templates/store/milk-run.module.css";
import { useShopCart } from "@/hooks/use-shop-cart";
import { formatDisplayPrice } from "@/lib/public-storefront";
import { cn } from "@/lib/utils";

function ChatTillIcon() {
  return (
    <svg
      className={styles.tillLaneIcon}
      viewBox="0 0 56 48"
      fill="none"
      aria-hidden
    >
      <rect
        x="4"
        y="6"
        width="34"
        height="26"
        rx="8"
        fill="#25D366"
        stroke="#2B1810"
        strokeWidth="2.5"
      />
      <path
        d="M14 32 L10 40 L22 32"
        fill="#25D366"
        stroke="#2B1810"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      <circle cx="15" cy="19" r="2.2" fill="#FFFCF5" />
      <circle cx="21" cy="19" r="2.2" fill="#FFFCF5" />
      <circle cx="27" cy="19" r="2.2" fill="#FFFCF5" />
      <rect
        x="28"
        y="18"
        width="24"
        height="22"
        rx="5"
        fill="#FFFCF5"
        stroke="#2B1810"
        strokeWidth="2.5"
      />
      <path
        d="M34 25h12M34 30h8"
        stroke="#2B1810"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function RegisterTillIcon() {
  return (
    <svg
      className={styles.tillLaneIcon}
      viewBox="0 0 56 48"
      fill="none"
      aria-hidden
    >
      <rect
        x="8"
        y="10"
        width="40"
        height="28"
        rx="6"
        fill="#2440E0"
        stroke="#2B1810"
        strokeWidth="2.5"
      />
      <rect
        x="14"
        y="16"
        width="28"
        height="10"
        rx="2"
        fill="#FFFCF5"
        stroke="#2B1810"
        strokeWidth="2"
      />
      <circle cx="18" cy="33" r="2.2" fill="#FFC53D" stroke="#2B1810" strokeWidth="1.5" />
      <circle cx="28" cy="33" r="2.2" fill="#FFC53D" stroke="#2B1810" strokeWidth="1.5" />
      <circle cx="38" cy="33" r="2.2" fill="#FFC53D" stroke="#2B1810" strokeWidth="1.5" />
      <path
        d="M20 4h16l-2 6H22L20 4Z"
        fill="#E8412C"
        stroke="#2B1810"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * Milk Run dual-path checkout: chat till (WhatsApp) vs register till (ordinary).
 */
export function MilkRunCheckoutChoice() {
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);
  const {
    cart,
    checkoutChoiceOpen,
    closeCheckoutChoice,
    beginOrdinaryCheckout,
    whatsappCheckout,
    openWhatsAppCheckout,
  } = useShopCart();

  useEffect(() => {
    if (!checkoutChoiceOpen) return;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeCheckoutChoice();
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [checkoutChoiceOpen, closeCheckoutChoice]);

  if (!checkoutChoiceOpen || !cart || !whatsappCheckout) {
    return null;
  }

  const subtotal =
    cart.subtotal != null
      ? formatDisplayPrice(cart.currency, cart.subtotal)
      : null;
  const itemLabel = `${cart.lines.length} item${cart.lines.length === 1 ? "" : "s"}`;

  const openChat = () => {
    // Order-first handoff: the shared sheet captures name + phone, creates the
    // order, then opens wa.me with the order code (scope D2).
    openWhatsAppCheckout();
  };

  return (
    <div
      className={cn(styles.tillScrim, milkRunFontVariables)}
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) closeCheckoutChoice();
      }}
    >
      <div
        className={styles.tillSheet}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <button
          ref={closeRef}
          type="button"
          className={styles.tillClose}
          onClick={closeCheckoutChoice}
          aria-label="Close"
        >
          ×
        </button>

        <h2 id={titleId} className={styles.tillTitle}>
          Which till?
        </h2>
        <p className={styles.tillLead}>
          Same bag of goods — pick how you want to finish. Chat with the shop, or
          check out yourself online.
        </p>

        <div className={styles.tillSummary}>
          <span>{itemLabel} in your bag</span>
          {subtotal ? <span>Subtotal {subtotal}</span> : null}
          {cart.catalogBranchName ? (
            <span>{cart.catalogBranchName}</span>
          ) : null}
        </div>

        <div className={styles.tillLanes}>
          <button
            type="button"
            className={cn(styles.tillLane, styles.tillLaneChat)}
            onClick={openChat}
            disabled={!whatsappCheckout.whatsappDigits}
          >
            <div
              className={styles.tillLaneFlap}
              style={{ background: "var(--milk-wa)" }}
            />
            <div className={styles.tillLaneBody}>
              <ChatTillIcon />
              <p className={styles.tillLaneName}>Chat till</p>
              <p className={styles.tillLaneDesc}>
                WhatsApp the full order — confirm stock, pickup, and how you pay
                in one conversation.
              </p>
              <span className={styles.tillLaneCta}>
                Open WhatsApp
                <span aria-hidden>→</span>
              </span>
            </div>
          </button>

          <button
            type="button"
            className={cn(styles.tillLane, styles.tillLaneRegister)}
            onClick={beginOrdinaryCheckout}
          >
            <div
              className={styles.tillLaneFlap}
              style={{ background: "var(--milk-cobalt)" }}
            />
            <div className={styles.tillLaneBody}>
              <RegisterTillIcon />
              <p className={styles.tillLaneName}>Register till</p>
              <p className={styles.tillLaneDesc}>
                Self-serve checkout — leave your details and follow this shop&apos;s
                usual payment steps.
              </p>
              <span className={styles.tillLaneCta}>
                Go to checkout
                <span aria-hidden>→</span>
              </span>
            </div>
          </button>
        </div>

        <p className={styles.tillFoot}>
          Either lane gets your items to the shop. You can switch next time.
        </p>
      </div>
    </div>
  );
}
