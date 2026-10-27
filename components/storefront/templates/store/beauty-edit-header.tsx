"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";

import { StorefrontAccountLink } from "@/components/storefront/storefront-account-link";
import { StorefrontEditableLogoMark } from "@/components/storefront/storefront-editable-logo";
import styles from "@/components/storefront/templates/store/beauty-edit.module.css";
import { filterShopperTypes } from "@/components/storefront/shop-type-filters";
import { useShopCart } from "@/hooks/use-shop-cart";
import { APP_ROUTES, apiUrl } from "@/lib/config";
import type { PublicCatalogType } from "@/lib/public-storefront";
import { shopListPath } from "@/lib/shop-url";
import { cn } from "@/lib/utils";

function SearchForm({
  className,
  autoFocus = false,
}: {
  className?: string;
  autoFocus?: boolean;
}) {
  const pathname = usePathname();
  const sp = useSearchParams();
  const inputRef = useRef<HTMLInputElement>(null);
  const q = sp.get("q")?.trim() ?? "";
  const typeId = sp.get("typeId")?.trim() || sp.get("departmentId")?.trim();
  const action = pathname.startsWith("/shop") ? pathname : APP_ROUTES.shop;

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus();
  }, [autoFocus]);

  return (
    <form action={action} method="get" className={cn(styles.searchForm, className)} role="search">
      <label className="sr-only" htmlFor="be-search-q">
        Search products
      </label>
      <input
        id="be-search-q"
        ref={inputRef}
        name="q"
        type="search"
        defaultValue={q}
        placeholder="Search"
      />
      {typeId ? <input type="hidden" name="typeId" value={typeId} /> : null}
      <button type="submit" aria-label="Search">
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden>
          <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.5" />
          <path d="M16.5 16.5 21 21" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </button>
    </form>
  );
}

function NavLinks({ types }: { types: PublicCatalogType[] }) {
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
    <nav className={styles.nav} aria-label="Shop categories">
      <Link
        href={shopListPath({ categoryPathSlug, q: q || undefined })}
        className={cn(styles.navLink, !activeId && styles.navLinkActive)}
      >
        Shop all
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

export function BeautyEditHeader({
  slug,
  storeName,
  logoUrl,
  announcement,
  whatsapp,
  className,
}: {
  slug: string;
  storeName: string;
  logoUrl?: string | null;
  announcement?: string | null;
  whatsapp?: string | null;
  className?: string;
}) {
  const { itemCount, openDrawer } = useShopCart();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [types, setTypes] = useState<PublicCatalogType[]>([]);
  /**
   * Wide wordmark assets already carry the store name, so the masthead drops the
   * typeset name beside them; square seals get the serif wordmark as a lockup.
   */
  const [logoAspect, setLogoAspect] = useState<number | null>(null);
  const wa = whatsapp?.replace(/\D/g, "") || "";
  const announce = announcement?.trim() || "";
  const showWordmark = !logoUrl || (logoAspect != null && logoAspect < 1.6);

  useEffect(() => {
    if (!logoUrl) {
      setLogoAspect(null);
      return;
    }
    let cancelled = false;
    const img = new window.Image();
    img.onload = () => {
      if (cancelled) return;
      setLogoAspect(
        img.naturalHeight > 0 ? img.naturalWidth / img.naturalHeight : 1,
      );
    };
    img.src = logoUrl;
    return () => {
      cancelled = true;
    };
  }, [logoUrl]);

  // The storefront scrolls inside a pane, not the window — capture scroll
  // events from any descendant so the masthead can tighten up.
  useEffect(() => {
    const onScroll = (event: Event) => {
      const target = event.target as HTMLElement | Document | null;
      const y =
        target && target !== document && "scrollTop" in target
          ? (target as HTMLElement).scrollTop
          : window.scrollY;
      setScrolled(y > 24);
    };
    document.addEventListener("scroll", onScroll, true);
    return () => document.removeEventListener("scroll", onScroll, true);
  }, []);

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
    <header
      className={cn(styles.header, scrolled && styles.headerScrolled, className)}
    >
      <span className={styles.brandStripe} aria-hidden />

      {announce || wa ? (
        <div className={styles.announce}>
          {announce ? <p className={styles.announceText}>{announce}</p> : null}
          {announce && wa ? <span className={styles.announceRule} aria-hidden /> : null}
          {wa ? (
            <a
              href={`https://wa.me/${wa}`}
              className={styles.announceLink}
              target="_blank"
              rel="noopener noreferrer"
            >
              WhatsApp +{wa}
            </a>
          ) : null}
        </div>
      ) : null}

      <div className={styles.masthead}>
        <div className={styles.headerRow}>
          <div className={styles.headerLead}>
            <button
              type="button"
              className={styles.menuBtn}
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((v) => !v)}
            >
              <span data-open={menuOpen || undefined} />
              <span data-open={menuOpen || undefined} />
            </button>
            <Suspense fallback={null}>
              <SearchForm className={styles.headerSearch} />
            </Suspense>
          </div>

          <Link href={APP_ROUTES.shop} className={styles.logo}>
            <StorefrontEditableLogoMark
              logoUrl={logoUrl}
              alt={storeName}
              width={160}
              height={160}
              className={styles.logoMark}
              fallback={null}
            />
            {showWordmark ? (
              <span className={styles.logoWord}>{storeName}</span>
            ) : null}
          </Link>

          <div className={styles.headerActions}>
            <button
              type="button"
              className={styles.searchBtn}
              aria-label={searchOpen ? "Close search" : "Search products"}
              aria-expanded={searchOpen}
              onClick={() => setSearchOpen((v) => !v)}
            >
              <svg width="19" height="19" viewBox="0 0 24 24" fill="none" aria-hidden>
                <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.5" />
                <path
                  d="M16.5 16.5 21 21"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
            </button>
            <StorefrontAccountLink
              className={styles.utilLink}
              signUpClassName={styles.utilLink}
            />
            <button
              type="button"
              className={styles.bagBtn}
              onClick={openDrawer}
              aria-label={`Bag, ${itemCount} ${itemCount === 1 ? "item" : "items"}`}
            >
              <svg
                className={styles.bagIcon}
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                aria-hidden
              >
                <path
                  d="M5 8h14l-1.2 11.2a1.5 1.5 0 0 1-1.5 1.3H7.7a1.5 1.5 0 0 1-1.5-1.3L5 8Z"
                  stroke="currentColor"
                  strokeWidth="1.4"
                  strokeLinejoin="round"
                />
                <path d="M9 8V6.5a3 3 0 1 1 6 0V8" stroke="currentColor" strokeWidth="1.4" />
              </svg>
              <span className={styles.bagLabel}>Bag</span>
              <span className={styles.bagCount}>{Math.min(itemCount, 99)}</span>
            </button>
          </div>
        </div>

        {searchOpen ? (
          <div className={styles.mobileSearch}>
            <Suspense fallback={null}>
              <SearchForm autoFocus />
            </Suspense>
          </div>
        ) : null}

        <div className={cn(styles.navWrap, menuOpen && styles.navWrapOpen)}>
          <div className={styles.navWrapInner}>
            <Suspense fallback={null}>
              <NavLinks types={types} />
            </Suspense>
          </div>
        </div>
      </div>
    </header>
  );
}
