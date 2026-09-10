"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

import { StorefrontAccountLink } from "@/components/storefront/storefront-account-link";
import { StorefrontEditableLogoMark } from "@/components/storefront/storefront-editable-logo";
import { filterShopperTypes } from "@/components/storefront/shop-type-filters";
import { useStorefrontLiveDesign } from "@/components/storefront/storefront-staff-edit";
import {
  gazetteEdition,
  gazettePlateName,
} from "@/components/storefront/templates/store/daily-gazette-copy";
import styles from "@/components/storefront/templates/store/daily-gazette.module.css";
import { useShopCart } from "@/hooks/use-shop-cart";
import { APP_ROUTES, apiUrl } from "@/lib/config";
import type { PublicCatalogType } from "@/lib/public-storefront";
import { shopListPath } from "@/lib/shop-url";
import { themeOptionString } from "@/lib/storefront-theme-options";
import type { StorefrontDesign } from "@/lib/storefront-design";
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
        Search this edition
      </label>
      <input
        id={id}
        name="q"
        type="search"
        defaultValue={q}
        placeholder="Search this edition"
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
        All
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

export function DailyGazetteHeader({
  slug,
  storeName,
  logoUrl,
  announcement,
  design,
  className,
}: {
  slug: string;
  storeName: string;
  logoUrl?: string | null;
  announcement?: string | null;
  design?: StorefrontDesign | null;
  className?: string;
}) {
  const liveDesign = useStorefrontLiveDesign(design ?? null);
  const { itemCount, openDrawer } = useShopCart();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [types, setTypes] = useState<PublicCatalogType[]>([]);
  const kicker = themeOptionString("daily-gazette", liveDesign?.theme ?? null, "kicker");
  const plate = gazettePlateName(storeName);
  const edition = gazetteEdition(storeName);
  const tagline =
    announcement?.trim() || "Goods for a stronger tomorrow";

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
      <div className={styles.masthead}>
        <div className={styles.mastheadTop}>
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
          {logoUrl ? (
            <Link href={APP_ROUTES.shop} aria-label={storeName}>
              <StorefrontEditableLogoMark
                logoUrl={logoUrl}
                alt={storeName}
                width={120}
                height={28}
                className={styles.logoMark}
              />
            </Link>
          ) : (
            <span />
          )}
          <div className={styles.tools}>
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
                <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.6" />
                <path
                  d="M16.5 16.5 21 21"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                />
              </svg>
            </button>
            <StorefrontAccountLink className={styles.iconBtn}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
                <circle cx="12" cy="8" r="3.25" stroke="currentColor" strokeWidth="1.6" />
                <path
                  d="M5.5 19.5c1.6-3.2 4-4.8 6.5-4.8s4.9 1.6 6.5 4.8"
                  stroke="currentColor"
                  strokeWidth="1.6"
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
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <path
                    d="M6 8h12l-1 11H7L6 8Z"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M9 8V6.5a3 3 0 0 1 6 0V8"
                    stroke="currentColor"
                    strokeWidth="1.6"
                  />
                </svg>
              </button>
              {itemCount > 0 ? (
                <span className={styles.bagCount}>{Math.min(itemCount, 99)}</span>
              ) : null}
            </div>
          </div>
        </div>

        <hr className={styles.rule} />
        <Link href={APP_ROUTES.shop} className={styles.plate}>
          <span className={styles.kicker}>{kicker}</span>
          {plate}
        </Link>
        <p className={styles.tagline}>{tagline}</p>
        <div className={styles.folio}>
          <span>
            VOL. {edition.vol} NO. {edition.no}
          </span>
          <span className={styles.folioDate}>{edition.date}</span>
        </div>
        <hr className={styles.rule} />
      </div>

      <Suspense fallback={null}>
        <NavLinks types={types} className={cn(styles.nav, styles.navDesktop)} />
      </Suspense>
      <hr className={styles.ruleThin} />

      <div className={cn(styles.navMobile, menuOpen && styles.navMobileOpen)}>
        <Suspense fallback={null}>
          <NavLinks types={types} />
        </Suspense>
      </div>

      <div className={cn(styles.searchPanel, searchOpen && styles.searchPanelOpen)}>
        <Suspense fallback={null}>
          <SearchForm id="dg-search-q" />
        </Suspense>
      </div>
    </header>
  );
}
