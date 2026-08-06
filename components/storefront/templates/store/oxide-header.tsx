"use client";

import Link from "next/link";

import styles from "@/components/storefront/templates/store/oxide.module.css";
import { useShopCart } from "@/hooks/use-shop-cart";
import { APP_ROUTES } from "@/lib/config";
import { cn } from "@/lib/utils";

function RegistrationMark({ className }: { className?: string }) {
  return <span className={cn(styles.reg, className)} aria-hidden />;
}

export function OxideHeader({
  storeName,
  className,
}: {
  storeName: string;
  className?: string;
}) {
  const { itemCount, openDrawer } = useShopCart();
  const countLabel = String(Math.min(itemCount, 99)).padStart(2, "0");

  return (
    <header className={cn(styles.header, className)}>
      <div className={styles.navWrap}>
        <Link href={APP_ROUTES.shop} className={styles.brand}>
          <span className="truncate">{storeName}</span>
          <span className={styles.brandTag}>EST. NO.04</span>
        </Link>
        <nav aria-label="Store sections">
          <ul className={styles.navList}>
            <li>
              <a className={styles.navLink} href="#catalog">
                Archive
              </a>
            </li>
            <li>
              <a className={styles.navLink} href="#manifest">
                Manifest
              </a>
            </li>
            <li>
              <a className={styles.navLink} href="#spec">
                Spec Sheet
              </a>
            </li>
            <li>
              <a className={styles.navLink} href="#signup">
                Dispatch
              </a>
            </li>
          </ul>
        </nav>
        <div className={styles.navRight}>
          <RegistrationMark />
          <button
            type="button"
            className={styles.cartCount}
            onClick={openDrawer}
            aria-label={`Open cart, ${itemCount} items`}
          >
            CART · {countLabel}
          </button>
        </div>
      </div>
    </header>
  );
}
