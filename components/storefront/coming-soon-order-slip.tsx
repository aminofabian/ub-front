"use client";

import { Minus, Plus } from "lucide-react";

import styles from "@/components/storefront/shop-storefront-coming-soon.module.css";
import { useComingSoonOrder } from "@/hooks/use-coming-soon-order";
import { lineAmount, type ComingSoonOrderLine } from "@/lib/coming-soon-order";
import { formatMoney } from "@/lib/money";
import { trackWhatsAppCheckoutEvent } from "@/lib/whatsapp-order";
import { cn } from "@/lib/utils";

export function ComingSoonOrderSlip() {
  const order = useComingSoonOrder();
  if (order.lines.length === 0 || !order.sendHref) return null;
  return (
    <section className={cn(styles.slip, order.open && styles.slipOpen)} aria-label="Your list">
      <button
        type="button"
        className={styles.slipBar}
        aria-expanded={order.open}
        onClick={() => order.setOpen(!order.open)}
      >
        <span className={styles.slipLead}>
          <span className={styles.slipTitle}>Your list</span>
          <span className={styles.slipHint}>{order.summary}</span>
        </span>
        <span className={styles.slipTotal}>{order.totalLabel ?? `${order.itemCount}`}</span>
      </button>
      {order.open ? <SlipLines /> : null}
      <div className={styles.slipActions}>
        <a
          className={styles.slipSend}
          href={order.sendHref}
          target="_blank"
          rel="noreferrer"
          onClick={() =>
            trackWhatsAppCheckoutEvent("wa_checkout_click", {
              surface: "coming-soon-list",
              items: order.itemCount,
            })
          }
        >
          Send on WhatsApp
        </a>
        {order.open ? (
          <button type="button" className={styles.clearList} onClick={order.clear}>
            Clear list
          </button>
        ) : null}
      </div>
    </section>
  );
}

function SlipLines() {
  const order = useComingSoonOrder();
  return (
    <ul className={styles.slipLines}>
      {order.lines.map((line) => (
        <SlipLine key={line.id} line={line} />
      ))}
      <li className={styles.slipNote}>
        {order.totalLabel
          ? "We confirm stock before you pay."
          : "We'll confirm the total with stock."}
      </li>
    </ul>
  );
}

function SlipLine({ line }: { line: ComingSoonOrderLine }) {
  const order = useComingSoonOrder();
  const amount = lineAmount(line);
  const price = amount == null ? line.priceLabel : formatMoney(amount, order.currency);
  return (
    <li className={styles.slipLine}>
      <span className={styles.slipName}>{line.name}</span>
      <span className={styles.stepper}>
        <button
          type="button"
          aria-label={`Remove one ${line.name}`}
          onClick={() => order.setQuantity(line.id, line.quantity - 1)}
        >
          <Minus size={16} strokeWidth={2} aria-hidden />
        </button>
        <span>{line.quantity}</span>
        <button
          type="button"
          aria-label={`Add another ${line.name}`}
          onClick={() => order.add(lineToDraft(line))}
        >
          <Plus size={16} strokeWidth={2} aria-hidden />
        </button>
      </span>
      {price ? <span className={styles.slipPrice}>{price}</span> : null}
    </li>
  );
}

function lineToDraft(line: ComingSoonOrderLine) {
  return { id: line.id, name: line.name, price: line.priceLabel };
}
