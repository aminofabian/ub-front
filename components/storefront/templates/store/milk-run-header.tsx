"use client";

import Link from "next/link";

import { StorefrontAccountLink } from "@/components/storefront/storefront-account-link";
import styles from "@/components/storefront/templates/store/milk-run.module.css";
import { useShopCart } from "@/hooks/use-shop-cart";
import { APP_ROUTES } from "@/lib/config";
import { cn } from "@/lib/utils";

function splitWordmark(storeName: string): { lead: string; accent: string } {
  const parts = storeName.trim().split(/\s+/).filter(Boolean);
  if (parts.length <= 1) {
    return { lead: parts[0] || "Shop", accent: "" };
  }
  return {
    lead: parts.slice(0, -1).join(" "),
    accent: parts[parts.length - 1]!,
  };
}

export function MilkRunHeader({
  storeName,
  locationNote,
  className,
}: {
  storeName: string;
  locationNote?: string | null;
  className?: string;
}) {
  const { itemCount, openDrawer } = useShopCart();
  const { lead, accent } = splitWordmark(storeName);
  const note = locationNote?.trim()
    ? `${locationNote.trim()} · Order online`
    : "Order online";

  return (
    <header className={cn(styles.header, className)}>
      <div className={styles.headerInner}>
        <Link href={APP_ROUTES.shop} className={styles.wordmark}>
          {lead}
          {accent ? (
            <>
              {" "}
              <em>{accent}</em>
            </>
          ) : null}
        </Link>
        <div className={styles.headerActions}>
          <span className={styles.headerNote}>{note}</span>
          <StorefrontAccountLink
            className={styles.accountLink}
            signUpClassName={styles.accountLink}
          />
          <button
            type="button"
            className={styles.cartBtn}
            onClick={openDrawer}
            aria-label={`Open cart, ${itemCount} items`}
          >
            Cart · {Math.min(itemCount, 99)}
          </button>
        </div>
      </div>
    </header>
  );
}
