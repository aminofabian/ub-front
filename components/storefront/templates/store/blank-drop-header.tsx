"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

import { StorefrontAccountLink } from "@/components/storefront/storefront-account-link";
import { filterShopperTypes } from "@/components/storefront/shop-type-filters";
import styles from "@/components/storefront/templates/store/blank-drop.module.css";
import { useShopCart } from "@/hooks/use-shop-cart";
import { APP_ROUTES, apiUrl } from "@/lib/config";
import type { PublicCatalogType } from "@/lib/public-storefront";
import { shopListPath } from "@/lib/shop-url";
import { cn } from "@/lib/utils";

function SearchForm({ id }: { id: string }) {
  const pathname = usePathname();
  const sp = useSearchParams();
  const q = sp.get("q")?.trim() ?? "";
  const typeId = sp.get("typeId")?.trim() || sp.get("departmentId")?.trim();
  const action = pathname.startsWith("/shop") ? pathname : APP_ROUTES.shop;

  return (
    <form action={action} method="get" className={styles.searchForm} role="search">
      <label className="sr-only" htmlFor={id}>
        Search
      </label>
      <input
        id={id}
        name="q"
        type="search"
        defaultValue={q}
        placeholder="Search"
      />
      {typeId ? <input type="hidden" name="typeId" value={typeId} /> : null}
      <button type="submit">Go</button>
    </form>
  );
}

function CenterFilters({ types }: { types: PublicCatalogType[] }) {
  const sp = useSearchParams();
  const activeId =
    sp.get("typeId")?.trim() || sp.get("departmentId")?.trim() || "";
  const q = sp.get("q")?.trim() ?? "";
  const visible = filterShopperTypes(types).slice(0, 4);

  return (
    <div className={styles.headerCenter}>
      <Link
        href={shopListPath({ q: q || undefined })}
        className={cn(styles.segBtn, !activeId && styles.segBtnActive)}
        scroll={false}
      >
        All
      </Link>
      {visible.map((type) => {
        const selected = activeId === type.id;
        return (
          <Link
            key={type.id}
            href={shopListPath({
              q: q || undefined,
              typeId: selected ? undefined : type.id,
            })}
            scroll={false}
            className={cn(styles.segBtn, selected && styles.segBtnActive)}
          >
            {type.label}
          </Link>
        );
      })}
    </div>
  );
}

export function BlankDropHeader({
  slug,
  className,
}: {
  slug: string;
  storeName?: string;
  logoUrl?: string | null;
  className?: string;
}) {
  const { itemCount, openDrawer } = useShopCart();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [types, setTypes] = useState<PublicCatalogType[]>([]);

  useEffect(() => {
    let cancelled = false;
    const url = apiUrl(
      `/api/v1/public/businesses/${encodeURIComponent(slug)}/catalog/types`,
    );
    void fetch(url, {
      headers: { Accept: "application/json" },
      cache: "no-store",
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((payload: { types?: PublicCatalogType[] } | null) => {
        if (!cancelled && payload?.types) setTypes(payload.types);
      });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  return (
    <header className={cn(styles.header, className)}>
      <div className={styles.headerRow}>
        <div className={styles.headerLeft}>
          <button
            type="button"
            className={styles.iconBtn}
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
            onClick={() => {
              setMenuOpen((v) => !v);
              setSearchOpen(false);
            }}
          >
            <span className={styles.plusIcon} aria-hidden>
              {menuOpen ? "×" : "+"}
            </span>
          </button>
        </div>

        <Suspense fallback={<div className={styles.headerCenter} />}>
          <CenterFilters types={types} />
        </Suspense>

        <div className={styles.headerRight}>
          <button
            type="button"
            className={styles.iconBtn}
            aria-label="Search"
            aria-expanded={searchOpen}
            onClick={() => {
              setSearchOpen((v) => !v);
              setMenuOpen(false);
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
              <circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="1.2" />
              <path d="M16 16.5 20 20.5" stroke="currentColor" strokeWidth="1.2" />
            </svg>
          </button>
          <StorefrontAccountLink className={styles.iconBtn}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
              <circle cx="12" cy="8" r="3" stroke="currentColor" strokeWidth="1.2" />
              <path
                d="M5.5 19c1.5-3 3.8-4.5 6.5-4.5S17 16 18.5 19"
                stroke="currentColor"
                strokeWidth="1.2"
                strokeLinecap="round"
              />
            </svg>
          </StorefrontAccountLink>
          <div className={styles.bagWrap}>
            <button
              type="button"
              className={styles.iconBtn}
              onClick={openDrawer}
              aria-label="Open cart"
              data-blank-drop-bag=""
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path
                  d="M6.5 8h11l-.8 11.5H7.3L6.5 8Z"
                  stroke="currentColor"
                  strokeWidth="1.2"
                  strokeLinejoin="round"
                />
                <path
                  d="M9 8V6.8a3 3 0 0 1 6 0V8"
                  stroke="currentColor"
                  strokeWidth="1.2"
                />
              </svg>
            </button>
            {itemCount > 0 ? (
              <span className={styles.bagCount}>{Math.min(itemCount, 99)}</span>
            ) : null}
          </div>
        </div>
      </div>

      <div className={cn(styles.menuPanel, menuOpen && styles.menuPanelOpen)}>
        <ul className={styles.menuList}>
          <li>
            <Link href={APP_ROUTES.shop} onClick={() => setMenuOpen(false)}>
              Shop
            </Link>
          </li>
          <li>
            <Link href={APP_ROUTES.shopCart} onClick={() => setMenuOpen(false)}>
              Bag
            </Link>
          </li>
          <li>
            <Link href={APP_ROUTES.shopAccount} onClick={() => setMenuOpen(false)}>
              Account
            </Link>
          </li>
          <li>
            <Link href={APP_ROUTES.shopCheckout} onClick={() => setMenuOpen(false)}>
              Checkout
            </Link>
          </li>
        </ul>
      </div>

      <div className={cn(styles.searchPanel, searchOpen && styles.searchPanelOpen)}>
        <Suspense fallback={null}>
          <SearchForm id="bd-search-q" />
        </Suspense>
      </div>
    </header>
  );
}
