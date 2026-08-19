"use client";

import { ArrowRight } from "lucide-react";

import { cn } from "@/lib/utils";
import styles from "./shop-order-thank-you.module.css";

export type ThankYouLine = {
  itemId: string;
  name: string;
  quantity: number;
  priceLabel: string;
};

type Props = {
  orderRef: string;
  branchName: string;
  totalLabel: string;
  lines: ThankYouLine[];
  payOnDelivery?: boolean;
  customerFirstName?: string;
  onContinue: () => void;
};

export function ShopOrderThankYou({
  orderRef,
  branchName,
  totalLabel,
  lines,
  payOnDelivery = false,
  customerFirstName,
  onContinue,
}: Props) {
  const first = customerFirstName?.trim();
  const headline = first ? `Asante, ${first}.` : "Asante.";
  const lede = payOnDelivery
    ? "Your order is with the shop. Pay cash or M-Pesa to the rider when it arrives."
    : "Payment received. The shop has your order and is getting it ready.";
  const footnote = payOnDelivery
    ? "Keep this reference handy when your delivery arrives."
    : `Collect from ${branchName} with this reference.`;

  return (
    <div className={styles.stage}>
      <div className={styles.scroll}>
        <article className={styles.ticket} aria-labelledby="shop-thank-you-title">
          <div className={styles.body}>
            <div className={styles.stampWrap} aria-hidden>
              <span className={styles.stamp}>
                <span className={styles.stampRing} />
                <span className={styles.stampFill} />
                <svg className={styles.stampCheck} viewBox="0 0 24 24">
                  <path d="M5.5 12.5 10 17l8.5-9.5" />
                </svg>
              </span>
            </div>
            <h1 id="shop-thank-you-title" className={styles.headline}>
              {headline}
            </h1>
            <p className={styles.lede}>{lede}</p>

            <dl className={styles.meta}>
              <div>
                <dt className={styles.metaLabel}>Reference</dt>
                <dd className={cn(styles.metaValue, styles.ref)}>#{orderRef}</dd>
              </div>
              <div>
                <dt className={styles.metaLabel}>{payOnDelivery ? "Due later" : "Paid"}</dt>
                <dd className={cn(styles.metaValue, styles.amount)}>{totalLabel}</dd>
              </div>
              <div>
                <dt className={styles.metaLabel}>Pickup</dt>
                <dd className={styles.metaValue}>{branchName}</dd>
              </div>
              <div>
                <dt className={styles.metaLabel}>Items</dt>
                <dd className={styles.metaValue}>
                  {lines.length} {lines.length === 1 ? "item" : "items"}
                </dd>
              </div>
            </dl>

            {lines.length > 0 ? (
              <ul className={styles.lines}>
                {lines.slice(0, 6).map((line) => (
                  <li key={line.itemId} className={styles.line}>
                    <span className={styles.lineName}>
                      {line.name}
                      <span className={styles.lineQty}> × {line.quantity}</span>
                    </span>
                    <span className={styles.linePrice}>{line.priceLabel}</span>
                  </li>
                ))}
              </ul>
            ) : null}

            <p className={styles.footnote}>{footnote}</p>
          </div>
        </article>
      </div>
      <div className={styles.dock}>
        <button type="button" className={styles.payBtn} onClick={onContinue}>
          Continue shopping
          <ArrowRight className="size-4" aria-hidden />
        </button>
      </div>
    </div>
  );
}
