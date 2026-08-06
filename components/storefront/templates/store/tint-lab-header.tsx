"use client";

import Link from "next/link";

import styles from "@/components/storefront/templates/store/tint-lab.module.css";
import { useShopCart } from "@/hooks/use-shop-cart";
import { APP_ROUTES } from "@/lib/config";
import { cn } from "@/lib/utils";

export function TintLabHeader({
  storeName,
  className,
}: {
  storeName: string;
  className?: string;
}) {
  const { itemCount, openDrawer } = useShopCart();
  const countLabel = String(Math.min(itemCount, 99)).padStart(2, "0");
  const parts = storeName.trim().split(/\s+/);
  const first = parts[0] || "Tint";
  const rest = parts.slice(1).join(" ") || "Lab";

  return (
    <header className={cn(styles.header, className)}>
      <div className={styles.navWrap}>
        <Link href={APP_ROUTES.shop} className={styles.brand}>
          {first} <em className={styles.brandEm}>{rest}</em>
        </Link>
        <nav aria-label="Store sections">
          <ul className={styles.navList}>
            <li>
              <a className={styles.navLink} href="#edit">
                The Edit
              </a>
            </li>
            <li>
              <a className={styles.navLink} href="#shade-story">
                Shade Story
              </a>
            </li>
            <li>
              <a className={styles.navLink} href="#disclosure">
                Full Disclosure
              </a>
            </li>
            <li>
              <a className={styles.navLink} href="#signup">
                Journal
              </a>
            </li>
          </ul>
        </nav>
        <div className={styles.navRight}>
          <Link
            href={APP_ROUTES.shopAccount}
            className={styles.iconBtn}
            aria-label="Account"
          >
            ♡
          </Link>
          <button
            type="button"
            className={cn(styles.iconBtn, styles.mono)}
            style={{ fontSize: 10 }}
            onClick={openDrawer}
            aria-label={`Open cart, ${itemCount} items`}
          >
            {countLabel}
          </button>
        </div>
      </div>
    </header>
  );
}
