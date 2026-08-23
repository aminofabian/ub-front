"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

import { StorefrontAccountLink } from "@/components/storefront/storefront-account-link";
import styles from "@/components/storefront/templates/store/carbon-desk.module.css";
import { useShopCart } from "@/hooks/use-shop-cart";
import { APP_ROUTES } from "@/lib/config";
import { cn } from "@/lib/utils";

function SearchForm({
  className,
  inputId = "cd-search-q",
}: {
  className?: string;
  inputId?: string;
}) {
  const pathname = usePathname();
  const sp = useSearchParams();
  const q = sp.get("q")?.trim() ?? "";
  const typeId = sp.get("typeId")?.trim() || sp.get("departmentId")?.trim();
  const action = pathname.startsWith("/shop") ? pathname : APP_ROUTES.shop;

  return (
    <form
      action={action}
      method="get"
      className={cn(styles.search, className)}
      role="search"
    >
      <label className="sr-only" htmlFor={inputId}>
        Search products
      </label>
      <span className={styles.searchPrefix} aria-hidden>
        SKU
      </span>
      <input
        id={inputId}
        name="q"
        type="search"
        defaultValue={q}
        placeholder="Look up item…"
      />
      {typeId ? <input type="hidden" name="typeId" value={typeId} /> : null}
      <button type="submit" aria-label="Search">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
          <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2.2" />
          <path
            d="M16.5 16.5 21 21"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
          />
        </svg>
      </button>
    </form>
  );
}

export function CarbonDeskHeader({
  storeName,
  logoUrl,
  className,
}: {
  storeName: string;
  logoUrl?: string | null;
  className?: string;
}) {
  const { itemCount, openDrawer } = useShopCart();

  return (
    <header className={cn(styles.header, className)}>
      <div className={styles.headerInner}>
        <Link href={APP_ROUTES.shop} className={styles.letterhead}>
          {logoUrl ? (
            <Image
              src={logoUrl}
              alt=""
              width={32}
              height={32}
              className={styles.letterheadImg}
              unoptimized
            />
          ) : null}
          <span className={styles.letterheadName}>{storeName}</span>
          <span className={styles.letterheadSub}>Stationery counter · open daily</span>
        </Link>
        <SearchForm />
        <div className={styles.headerActions}>
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
            Slips · {Math.min(itemCount, 99)}
          </button>
        </div>
      </div>
    </header>
  );
}

export function CarbonDeskMobileSearch() {
  return (
    <div className={styles.mobileSearch}>
      <SearchForm inputId="cd-search-q-mobile" />
    </div>
  );
}
