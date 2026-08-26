"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

import { StorefrontAccountLink } from "@/components/storefront/storefront-account-link";
import { StorefrontEditableLogoMark } from "@/components/storefront/storefront-editable-logo";
import { filterShopperTypes } from "@/components/storefront/shop-type-filters";
import styles from "@/components/storefront/templates/store/print-atelier.module.css";
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
        Search products
      </label>
      <input
        id={id}
        name="q"
        type="search"
        defaultValue={q}
        placeholder="Search the atelier"
      />
      {typeId ? <input type="hidden" name="typeId" value={typeId} /> : null}
      <button type="submit" aria-label="Search">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
          <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.6" />
          <path d="M16.5 16.5 21 21" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      </button>
    </form>
  );
}

function NavLinks({
  types,
  className,
}: {
  types: PublicCatalogType[];
  className?: string;
}) {
  const pathname = usePathname();
  const sp = useSearchParams();
  const activeId =
    sp.get("typeId")?.trim() || sp.get("departmentId")?.trim() || "";
  const q = sp.get("q")?.trim() ?? "";
  const visible = filterShopperTypes(types);
  const categoryPathSlug = pathname.startsWith("/shop/c/")
    ? pathname.slice("/shop/c/".length).split("/")[0]
    : undefined;

  return (
    <nav className={className} aria-label="Shop categories">
      <Link
        href={shopListPath({ categoryPathSlug, q: q || undefined })}
        className={cn(styles.navLink, !activeId && styles.navLinkActive)}
      >
        New Arrivals
      </Link>
      {visible.map((type) => {
        const selected = activeId === type.id;
        const href = shopListPath({
          categoryPathSlug,
          q: q || undefined,
          typeId: selected ? undefined : type.id,
        });
        return (
          <Link
            key={type.id}
            href={href}
            scroll={false}
            className={cn(styles.navLink, selected && styles.navLinkActive)}
          >
            {type.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function PrintAtelierHeader({
  slug,
  storeName,
  logoUrl,
  announcement,
  className,
}: {
  slug: string;
  storeName: string;
  logoUrl?: string | null;
  announcement?: string | null;
  className?: string;
}) {
  const { itemCount, openDrawer } = useShopCart();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [types, setTypes] = useState<PublicCatalogType[]>([]);
  const announce =
    announcement?.trim() ||
    "Welcome to the world of printed pieces — crafted in Nairobi";

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
        if (!cancelled && payload?.types) {
          setTypes(payload.types);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  return (
    <header className={cn(styles.header, className)}>
      <div className={styles.announce}>
        <p>
          <Link href={APP_ROUTES.shop}>{announce}</Link>
        </p>
      </div>

      <div className={styles.headerRow}>
        <button
          type="button"
          className={styles.menuBtn}
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          aria-expanded={menuOpen}
          onClick={() => {
            setMenuOpen((v) => !v);
            setSearchOpen(false);
          }}
        >
          <span />
          <span />
          <span />
        </button>

        <Link href={APP_ROUTES.shop} className={styles.logo}>
          <StorefrontEditableLogoMark
            logoUrl={logoUrl}
            alt={storeName}
            width={160}
            height={48}
            className={styles.logoImg}
            fallback={
              <span className={styles.logoMark}>
                <span className={styles.logoBox}>
                  {storeName.slice(0, 2).toUpperCase() || "PA"}
                </span>
                <span className={styles.logoSub}>{storeName}</span>
              </span>
            }
          />
        </Link>

        <Suspense fallback={null}>
          <NavLinks types={types} className={styles.navDesktop} />
        </Suspense>

        <div className={styles.headerActions}>
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
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
              <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.5" />
              <path
                d="M16.5 16.5 21 21"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </button>
          <StorefrontAccountLink className={styles.iconBtn}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
              <circle cx="12" cy="8" r="3.25" stroke="currentColor" strokeWidth="1.5" />
              <path
                d="M5.5 19.5c1.6-3.2 4-4.8 6.5-4.8s4.9 1.6 6.5 4.8"
                stroke="currentColor"
                strokeWidth="1.5"
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
              data-print-atelier-bag=""
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path
                  d="M6 8h12l-1 11H7L6 8Z"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinejoin="round"
                />
                <path
                  d="M9 8V6.5a3 3 0 0 1 6 0V8"
                  stroke="currentColor"
                  strokeWidth="1.5"
                />
              </svg>
            </button>
            {itemCount > 0 ? (
              <span className={styles.bagCount}>{Math.min(itemCount, 99)}</span>
            ) : null}
          </div>
        </div>
      </div>

      <div className={cn(styles.navMobile, menuOpen && styles.navMobileOpen)}>
        <Suspense fallback={null}>
          <NavLinks types={types} />
        </Suspense>
      </div>

      <div className={cn(styles.searchPanel, searchOpen && styles.searchPanelOpen)}>
        <Suspense fallback={null}>
          <SearchForm id="pa-search-q" />
        </Suspense>
      </div>
    </header>
  );
}
