"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

import { StorefrontAccountLink } from "@/components/storefront/storefront-account-link";
import { StorefrontEditableLogoMark } from "@/components/storefront/storefront-editable-logo";
import { filterShopperTypes } from "@/components/storefront/shop-type-filters";
import styles from "@/components/storefront/templates/store/pastry-case.module.css";
import { useShopCart } from "@/hooks/use-shop-cart";
import { APP_ROUTES, apiUrl } from "@/lib/config";
import type { PublicCatalogType } from "@/lib/public-storefront";
import { shopListPath } from "@/lib/shop-url";
import { cn } from "@/lib/utils";

function SearchForm({ className }: { className?: string }) {
  const pathname = usePathname();
  const sp = useSearchParams();
  const q = sp.get("q")?.trim() ?? "";
  const typeId = sp.get("typeId")?.trim() || sp.get("departmentId")?.trim();
  const action = pathname.startsWith("/shop") ? pathname : APP_ROUTES.shop;

  return (
    <form action={action} method="get" className={cn(styles.searchForm, className)} role="search">
      <label className="sr-only" htmlFor="pc-search-q">
        Search the shop
      </label>
      <input
        id="pc-search-q"
        name="q"
        type="search"
        defaultValue={q}
        placeholder="Search"
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
  const visible = filterShopperTypes(types).slice(0, 6);
  const categoryPathSlug = pathname.startsWith("/shop/c/")
    ? pathname.slice("/shop/c/".length).split("/")[0]
    : undefined;

  return (
    <nav className={cn(styles.nav, className)} aria-label="Shop categories">
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

type PastryCaseHeaderProps = {
  slug: string;
  storeName: string;
  logoUrl?: string | null;
  announcement?: string | null;
  whatsapp?: string | null;
  className?: string;
};

export function PastryCaseHeader(props: PastryCaseHeaderProps) {
  return (
    <Suspense fallback={<PastryCaseHeaderView {...props} listing={false} />}>
      <PastryCaseHeaderLive {...props} />
    </Suspense>
  );
}

function PastryCaseHeaderLive(props: PastryCaseHeaderProps) {
  const sp = useSearchParams();
  const listing = Boolean(
    sp.get("q")?.trim() ||
      sp.get("typeId")?.trim() ||
      sp.get("departmentId")?.trim() ||
      sp.get("categoryId")?.trim(),
  );
  return <PastryCaseHeaderView {...props} listing={listing} />;
}

function PastryCaseHeaderView({
  slug,
  storeName,
  logoUrl,
  announcement,
  whatsapp,
  className,
  listing,
}: PastryCaseHeaderProps & { listing: boolean }) {
  const pathname = usePathname();
  const { itemCount, openDrawer } = useShopCart();
  const [menuOpen, setMenuOpen] = useState(false);
  const [types, setTypes] = useState<PublicCatalogType[]>([]);
  const wa = whatsapp?.replace(/\D/g, "") || "";
  const isHome =
    !listing &&
    (pathname === "/" ||
      pathname === APP_ROUTES.shop ||
      pathname === `${APP_ROUTES.shop}/`);

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
      className={cn(styles.header, className)}
      data-over-hero={isHome ? "true" : undefined}
      data-open={menuOpen ? "true" : undefined}
    >
      <div className={styles.announce}>
        {wa ? (
          <p>
            Call / WhatsApp:{" "}
            <a href={`https://wa.me/${wa}`}>+{wa}</a>
          </p>
        ) : (
          <p>
            {announcement?.trim() ||
              "Order for pickup — we bake for the next celebration"}
          </p>
        )}
      </div>

      <div className={styles.headerRow}>
        <Link href={APP_ROUTES.shop} className={styles.logo}>
          <StorefrontEditableLogoMark
            logoUrl={logoUrl}
            alt={storeName}
            width={240}
            height={64}
            className={styles.logoImg}
            fallback={<span className={styles.logoText}>{storeName}</span>}
          />
        </Link>

        <Suspense fallback={null}>
          <NavLinks types={types} />
        </Suspense>

        <div className={styles.tools}>
          <Suspense fallback={null}>
            <SearchForm />
          </Suspense>
          <StorefrontAccountLink className={styles.iconBtn}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
              <circle cx="12" cy="8" r="3.2" stroke="currentColor" strokeWidth="1.5" />
              <path
                d="M5.5 19c1.2-3.2 3.4-4.7 6.5-4.7s5.3 1.5 6.5 4.7"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </StorefrontAccountLink>
          <button
            type="button"
            className={styles.cartBtn}
            onClick={openDrawer}
            aria-label={
              itemCount > 0 ? `Open bag, ${itemCount} items` : "Open bag"
            }
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
                strokeLinecap="round"
              />
            </svg>
            {itemCount > 0 ? (
              <span className={styles.cartCount}>{Math.min(itemCount, 99)}</span>
            ) : null}
          </button>
          <button
            type="button"
            className={styles.menuBtn}
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((v) => !v)}
          >
            <span />
            <span />
            <span />
          </button>
        </div>
      </div>

      <div className={styles.drawer}>
        <Suspense fallback={null}>
          <SearchForm />
        </Suspense>
        <Suspense fallback={null}>
          <NavLinks types={types} className={undefined} />
        </Suspense>
      </div>
    </header>
  );
}
