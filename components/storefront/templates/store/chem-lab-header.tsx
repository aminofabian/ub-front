"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

import { StorefrontAccountLink } from "@/components/storefront/storefront-account-link";
import { StorefrontEditableLogoMark } from "@/components/storefront/storefront-editable-logo";
import {
  ChemLabModeToggle,
  useChemLabCopy,
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
  const copy = useChemLabCopy();
  const q = sp.get("q")?.trim() ?? "";
  const typeId = sp.get("typeId")?.trim() || sp.get("departmentId")?.trim();
  const action = pathname.startsWith("/shop") ? pathname : APP_ROUTES.shop;
  const prefix = copy?.searchPrefix || "Find";
  const placeholder = copy?.searchPlaceholder || "Search products…";

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
        {prefix}
      </span>
      <input
        id={inputId}
        name="q"
        type="search"
        defaultValue={q}
        placeholder={placeholder}
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
  const copy = useChemLabCopy();
  const cartLabel = copy?.cart || "Cart";
  const shiftLabel =
    clMode === "dark"
      ? copy?.shiftDark || "Night"
      : copy?.shiftLight || "Day";

  return (
    <header className={cn(styles.header, className)}>
      <div className={styles.headerInner}>
        <Link href={APP_ROUTES.shop} className={styles.wordmark}>
          <StorefrontEditableLogoMark
            logoUrl={logoUrl}
            width={36}
            height={36}
            className={styles.wordmarkImg}
            fallback={
              <span className={styles.flaskIcon} aria-hidden>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M9 3.5h6M10 3.5v4.2L6.2 16.2A3.6 3.6 0 0 0 9.4 21h5.2a3.6 3.6 0 0 0 3.2-4.8L14 7.7V3.5"
                    stroke="currentColor"
                    strokeWidth="1.7"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M8.2 15.2h7.6"
                    stroke="currentColor"
                    strokeWidth="1.7"
                    strokeLinecap="round"
                    opacity="0.55"
                  />
                </svg>
              </span>
            }
          />
          <span className={styles.wordmarkCopy}>
            <span className={styles.wordmarkText}>{storeName}</span>
            <span className={styles.wordmarkSub}>
              <span className={styles.statusLed} aria-hidden />
              {shiftLabel}
            </span>
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
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path
                d="M9 3.5h6M10 3.5v3.8L6.4 15.5A3.2 3.2 0 0 0 9.2 20h5.6a3.2 3.2 0 0 0 2.8-4.5L14 7.3V3.5"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinejoin="round"
              />
              <path
                d="M8.4 14.8h7.2"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
                opacity="0.5"
              />
            </svg>
            {cartLabel}
            <span className={styles.cartPip}>{Math.min(itemCount, 99)}</span>
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
