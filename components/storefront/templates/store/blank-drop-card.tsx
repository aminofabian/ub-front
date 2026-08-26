"use client";

import Image from "next/image";
import Link from "next/link";

import { blankDropCode } from "@/components/storefront/templates/store/blank-drop-code";
import styles from "@/components/storefront/templates/store/blank-drop.module.css";
import { StorefrontProductImageShell } from "@/components/storefront/storefront-product-image-shell";
import { useStorefrontDisplayImage } from "@/components/storefront/storefront-staff-edit";
import { APP_ROUTES } from "@/lib/config";
import {
  formatDisplayPrice,
  type PublicCatalogItemCard,
} from "@/lib/public-storefront";
import { shopItemPathFromCard } from "@/lib/shop-item-url";
import { cn } from "@/lib/utils";

export function BlankDropCard({
  item,
  currency,
  showPrice = false,
}: {
  item: PublicCatalogItemCard;
  currency: string;
  showPrice?: boolean;
}) {
  const href = shopItemPathFromCard(item) || APP_ROUTES.shop;
  const imageUrl = useStorefrontDisplayImage(item.id, item.imageUrl);
  const code = blankDropCode(item);
  const price =
    item.price != null ? formatDisplayPrice(currency, item.price) : null;

  return (
    <article className={styles.card}>
      <StorefrontProductImageShell
        href={href}
        className={cn(styles.cardVisual, "relative")}
        itemId={item.id}
        itemName={item.name}
        ariaLabel={item.name}
      >
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={item.name}
            fill
            sizes="(min-width: 1200px) 16vw, (min-width: 960px) 25vw, 50vw"
            unoptimized
            style={{ objectFit: "contain" }}
          />
        ) : (
          <span className={styles.placeholder} aria-hidden />
        )}
      </StorefrontProductImageShell>
      <Link href={href} className={styles.cardCode}>
        {code}
      </Link>
      {showPrice && price ? <p className={styles.cardPrice}>{price}</p> : null}
    </article>
  );
}
