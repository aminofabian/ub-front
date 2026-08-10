"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

import styles from "@/components/storefront/templates/store/milk-run.module.css";
import { useShopCart } from "@/hooks/use-shop-cart";
import { APP_ROUTES } from "@/lib/config";
import {
  formatDisplayPrice,
  type PublicCatalogItemCard,
} from "@/lib/public-storefront";
import { shopItemPathFromCard } from "@/lib/shop-item-url";

const FLAP_COLORS = [
  "var(--milk-cobalt)",
  "var(--milk-cherry)",
  "var(--milk-sunshine)",
  "var(--milk-mint)",
];

const WA_ICON = (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden>
    <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.46 1.32 4.96L2.05 22l5.25-1.38a9.9 9.9 0 0 0 4.74 1.21h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.86 9.86 0 0 0 12.04 2m0 1.67a8.23 8.23 0 0 1 5.83 2.42 8.19 8.19 0 0 1 2.41 5.82c0 4.54-3.7 8.24-8.25 8.24a8.2 8.2 0 0 1-4.19-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.18 8.18 0 0 1-1.26-4.38c0-4.55 3.7-8.24 8.25-8.24M8.53 6.83c-.16 0-.43.06-.66.31s-.87.86-.87 2.09.9 2.42 1.02 2.59c.12.16 1.75 2.8 4.35 3.79 2.15.83 2.59.66 3.06.62.47-.04 1.5-.61 1.71-1.2s.21-1.09.15-1.2-.23-.16-.47-.28-1.5-.74-1.73-.82-.4-.12-.57.12-.65.82-.8 1-.29.2-.55.08-1.08-.4-2.06-1.27c-.76-.68-1.28-1.52-1.43-1.78s-.02-.4.11-.53c.12-.12.28-.31.4-.47.14-.15.18-.27.28-.43.09-.16.05-.31-.02-.43s-.57-1.38-.79-1.88c-.2-.5-.42-.43-.57-.44z" />
  </svg>
);

function MilkRunAddButton({ item }: { item: PublicCatalogItemCard }) {
  const cart = useShopCart();
  const [busy, setBusy] = useState(false);

  const onAdd = async () => {
    if (busy || item.price == null) return;
    setBusy(true);
    try {
      const existing =
        cart.cart?.lines.find((l) => l.itemId === item.id)?.quantity ?? 0;
      await cart.setLineQty(item.id, existing + 1);
      cart.notifyAdded(item.id);
      cart.openDrawer();
    } catch {
      /* cart UI surfaces failures */
    } finally {
      setBusy(false);
    }
  };

  if (item.price == null) {
    return null;
  }

  return (
    <button
      type="button"
      className={styles.addBtn}
      disabled={busy}
      onClick={() => void onAdd()}
    >
      {busy ? "…" : "Add"}
    </button>
  );
}

export function MilkRunCard({
  item,
  index,
  currency,
  featured,
  whatsappDigits,
  storeName,
}: {
  item: PublicCatalogItemCard;
  index: number;
  currency: string;
  featured: boolean;
  whatsappDigits: string | null;
  storeName: string;
}) {
  const href = shopItemPathFromCard(item) || APP_ROUTES.shop;
  const flap = FLAP_COLORS[index % FLAP_COLORS.length]!;
  const meta =
    [item.variantName?.trim(), item.unitType?.trim()].filter(Boolean).join(" · ") ||
    "In stock";
  const tag = featured ? "Featured" : item.sku?.trim() ? "Stocked" : null;

  const waHref =
    whatsappDigits && item.price != null
      ? `https://wa.me/${whatsappDigits}?text=${encodeURIComponent(
          `Hi ${storeName}, I'd like to order ${item.name} (${formatDisplayPrice(currency, item.price)}).`,
        )}`
      : null;

  return (
    <article className={styles.card}>
      <div className={styles.flap} style={{ background: flap }} />
      <div className={styles.cardBody}>
        <Link href={href} className={styles.cardVisual}>
          {item.imageUrl ? (
            <Image
              src={item.imageUrl}
              alt={item.name}
              width={480}
              height={480}
              unoptimized
            />
          ) : (
            <span className={styles.cardPlaceholder} aria-hidden />
          )}
        </Link>
        <div className={styles.cardTop}>
          <Link href={href} className={styles.cardName}>
            {item.name}
          </Link>
          {tag ? <span className={styles.cardTag}>{tag}</span> : null}
        </div>
        <p className={styles.cardMeta}>{meta}</p>
        <div className={styles.cardFoot}>
          <span className={styles.price}>
            {item.price != null ? formatDisplayPrice(currency, item.price) : "—"}
          </span>
          <div className={styles.cardActions}>
            <MilkRunAddButton item={item} />
            {waHref ? (
              <a
                className={styles.waBtn}
                href={waHref}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Order ${item.name} on WhatsApp`}
              >
                {WA_ICON}
              </a>
            ) : null}
          </div>
        </div>
      </div>
    </article>
  );
}
