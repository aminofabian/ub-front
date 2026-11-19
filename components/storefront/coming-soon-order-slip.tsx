"use client";

import { Minus, Plus } from "lucide-react";

import styles from "@/components/storefront/shop-storefront-coming-soon.module.css";
import { useComingSoonOrder } from "@/hooks/use-coming-soon-order";
import { lineAmount, type ComingSoonOrderLine } from "@/lib/coming-soon-order";
import { formatMoney } from "@/lib/money";
import { trackWhatsAppCheckoutEvent } from "@/lib/whatsapp-order";

export function ComingSoonOrderSlip() {
  const order = useComingSoonOrder();
  if (order.lines.length === 0 || !order.sendHref || !order.open) return null;
  return (
    <section id="your-list" className={styles.slip} aria-label="Your list">
      <div className={styles.slipBar}>
        <p className={styles.slipTitle}>Your list</p>
        <button
          type="button"
          className={styles.slipMinimize}
          aria-label="Minimize"
          onClick={() => {
            order.setOpen(false);
            document.getElementById("your-list-toggle")?.focus();
          }}
        >
          <Minus size={16} strokeWidth={2} aria-hidden />
        </button>
        <p className={styles.slipHint}>{order.summary}</p>
      </div>
      <SlipLines />
      <div className={styles.slipFoot}>
        <p className={styles.slipTotal}>{order.totalLabel ?? `${order.itemCount}`}</p>
        <p className={styles.slipNote}>
          {order.totalLabel
            ? "We confirm stock before you pay."
            : "We'll confirm the total with stock."}
        </p>
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
        <button type="button" className={styles.clearList} onClick={order.clear}>
          Clear list
        </button>
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
      <span className={styles.slipPrice}>{price}</span>
    </li>
  );
}

function lineToDraft(line: ComingSoonOrderLine) {
  return { id: line.id, name: line.name, price: line.priceLabel };
}
