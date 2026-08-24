"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

import { StorefrontAccountLink } from "@/components/storefront/storefront-account-link";
import { StorefrontEditableLogoMark } from "@/components/storefront/storefront-editable-logo";
import {
  ChemLabModeToggle,
  useChemLabMode,
} from "@/components/storefront/templates/store/chem-lab-mode";
import styles from "@/components/storefront/templates/store/chem-lab.module.css";
import { useShopCart } from "@/hooks/use-shop-cart";
import { APP_ROUTES } from "@/lib/config";
import { cn } from "@/lib/utils";

function SearchForm({
  className,
  inputId = "cl-search-q",
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
        CAS
      </span>
      <input
        id={inputId}
        name="q"
        type="search"
        defaultValue={q}
        placeholder="Lookup compound…"
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

export function ChemLabHeader({
  storeName,
  logoUrl,
  className,
}: {
  storeName: string;
  logoUrl?: string | null;
  className?: string;
}) {
  const { itemCount, openDrawer } = useShopCart();
  const clMode = useChemLabMode();

  return (
    <header className={cn(styles.header, className)}>
      <div className={styles.headerInner}>
        <Link href={APP_ROUTES.shop} className={styles.wordmark}>
          <StorefrontEditableLogoMark
            logoUrl={logoUrl}
            width={32}
            height={32}
            className={styles.wordmarkImg}
            fallback={
              <span className={styles.flaskIcon} aria-hidden>
                ⚗
              </span>
            }
          />
          <span className={styles.wordmarkText}>{storeName}</span>
          <span className={styles.wordmarkSub}>
            {clMode === "dark" ? "Night shift · open" : "Day shift · open"}
          </span>
        </Link>
        <SearchForm />
        <div className={styles.headerActions}>
          <ChemLabModeToggle />
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
            Beaker · {Math.min(itemCount, 99)}
          </button>
        </div>
      </div>
    </header>
  );
}

export function ChemLabMobileSearch() {
  return (
    <div className={styles.mobileSearch}>
      <SearchForm inputId="cl-search-q-mobile" />
    </div>
  );
}
