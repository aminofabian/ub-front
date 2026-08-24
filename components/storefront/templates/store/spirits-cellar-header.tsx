"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

import { StorefrontAccountLink } from "@/components/storefront/storefront-account-link";
import { StorefrontEditableLogoMark } from "@/components/storefront/storefront-editable-logo";
import styles from "@/components/storefront/templates/store/spirits-cellar.module.css";
import { useShopCart } from "@/hooks/use-shop-cart";
import { APP_ROUTES } from "@/lib/config";
import { cn } from "@/lib/utils";

function SearchForm({
  className,
  inputId = "sc-search-q",
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
      <input
        id={inputId}
        name="q"
        type="search"
        defaultValue={q}
        placeholder="Search the vault…"
      />
      {typeId ? <input type="hidden" name="typeId" value={typeId} /> : null}
      <button type="submit" aria-label="Search">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
          <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
          <path
            d="M16.5 16.5 21 21"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      </button>
    </form>
  );
}

export function SpiritsCellarHeader({
  storeName,
  logoUrl,
  className,
}: {
  storeName: string;
  logoUrl?: string | null;
  className?: string;
}) {
  const { itemCount, openDrawer } = useShopCart();
  const parts = storeName.trim().split(/\s+/);
  const first = parts[0] || storeName;
  const rest = parts.slice(1).join(" ");

  return (
    <header className={cn(styles.header, className)}>
      <div className={styles.headerInner}>
        <Link href={APP_ROUTES.shop} className={styles.wordmark}>
          <StorefrontEditableLogoMark
            logoUrl={logoUrl}
            width={34}
            height={34}
            className={styles.wordmarkImg}
          />
          <span className={styles.wordmarkText}>
            {first}
            {rest ? (
              <>
                {" "}
                <em>{rest}</em>
              </>
            ) : null}
          </span>
          <span className={styles.wordmarkSub}>Essence vault · by candle</span>
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
            Vault · {Math.min(itemCount, 99)}
          </button>
        </div>
      </div>
    </header>
  );
}

export function SpiritsCellarMobileSearch() {
  return (
    <div className={styles.mobileSearch}>
      <SearchForm inputId="sc-search-q-mobile" />
    </div>
  );
}
