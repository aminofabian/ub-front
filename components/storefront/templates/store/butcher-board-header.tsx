"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

import { StorefrontAccountLink } from "@/components/storefront/storefront-account-link";
import { StorefrontEditableLogoMark } from "@/components/storefront/storefront-editable-logo";
import styles from "@/components/storefront/templates/store/butcher-board.module.css";
import { useShopCart } from "@/hooks/use-shop-cart";
import { APP_ROUTES } from "@/lib/config";
import { cn } from "@/lib/utils";

function Star({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className ?? styles.star} aria-hidden>
      <path d="M12 2.2 14.7 9h7.3l-5.9 4.3 2.3 7.1L12 16.6 5.6 20.4 7.9 13.3 2 9h7.3L12 2.2Z" />
    </svg>
  );
}

function SearchForm({
  className,
  inputId = "bb-search-q",
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
    <form action={action} method="get" className={cn(styles.search, className)} role="search">
      <label className="sr-only" htmlFor={inputId}>
        Search products
      </label>
      <input
        id={inputId}
        name="q"
        type="search"
        defaultValue={q}
        placeholder="Search the board…"
      />
      {typeId ? <input type="hidden" name="typeId" value={typeId} /> : null}
      <button type="submit" aria-label="Search">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
          <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2.2" />
          <path d="M16.5 16.5 21 21" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
        </svg>
      </button>
    </form>
  );
}

export function ButcherBoardHeader({
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
        <Link href={APP_ROUTES.shop} className={styles.wordmark}>
          <StorefrontEditableLogoMark
            logoUrl={logoUrl}
            width={36}
            height={36}
            className={styles.wordmarkImg}
            fallback={<Star />}
          />
          <span className={styles.wordmarkText}>{storeName}</span>
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
            <Star />
            Cart · {Math.min(itemCount, 99)}
          </button>
        </div>
      </div>
    </header>
  );
}

export function ButcherBoardMobileSearch() {
  return (
    <div className={styles.mobileSearch}>
      <SearchForm inputId="bb-search-q-mobile" />
    </div>
  );
}
