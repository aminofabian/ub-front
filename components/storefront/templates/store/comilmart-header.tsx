"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

import { StorefrontAccountLink } from "@/components/storefront/storefront-account-link";
import { StorefrontEditableLogoMark } from "@/components/storefront/storefront-editable-logo";
import { filterShopperTypes } from "@/components/storefront/shop-type-filters";
import styles from "@/components/storefront/templates/store/comilmart.module.css";
import { useShopCart } from "@/hooks/use-shop-cart";
import { APP_ROUTES, apiUrl } from "@/lib/config";
import type { PublicCatalogType, PublicCategory } from "@/lib/public-storefront";
import { shopListPath, storefrontCategoryPathSlug } from "@/lib/shop-url";
import { cn } from "@/lib/utils";

function LiveClock() {
  const [time, setTime] = useState("");

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      setTime(
        now.toLocaleTimeString(undefined, {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: false,
        }),
      );
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, []);

  return <span className={styles.clock}>{time || "—:—:—"}</span>;
}

function SearchForm({ className }: { className?: string }) {
  const pathname = usePathname();
  const sp = useSearchParams();
  const q = sp.get("q")?.trim() ?? "";
  const typeId = sp.get("typeId")?.trim() || sp.get("departmentId")?.trim();
  const action = pathname.startsWith("/shop") ? pathname : APP_ROUTES.shop;

  return (
    <form
      action={action}
      method="get"
      className={cn(styles.searchForm, className)}
      role="search"
    >
      <label className="sr-only" htmlFor="cm-search-q">
        Search products
      </label>
      <input
        id="cm-search-q"
        name="q"
        type="search"
        defaultValue={q}
        placeholder="Search products…"
      />
      {typeId ? <input type="hidden" name="typeId" value={typeId} /> : null}
      <button type="submit" className={styles.searchSubmit}>
        Search
      </button>
    </form>
  );
}

type ComilmartHeaderProps = {
  slug: string;
  storeName: string;
  logoUrl?: string | null;
  announcement?: string | null;
  areaLabel?: string | null;
  branchHint?: string | null;
  whatsapp?: string | null;
  categories?: PublicCategory[];
  className?: string;
};

export function ComilmartHeader(props: ComilmartHeaderProps) {
  return (
    <Suspense fallback={<ComilmartHeaderView {...props} listing={false} />}>
      <ComilmartHeaderLive {...props} />
    </Suspense>
  );
}

function ComilmartHeaderLive(props: ComilmartHeaderProps) {
  const sp = useSearchParams();
  const listing = Boolean(
    sp.get("q")?.trim() ||
      sp.get("typeId")?.trim() ||
      sp.get("departmentId")?.trim() ||
      sp.get("categoryId")?.trim(),
  );
  return <ComilmartHeaderView {...props} listing={listing} />;
}

function ComilmartHeaderView({
  slug,
  storeName,
  logoUrl,
  announcement,
  areaLabel,
  branchHint,
  whatsapp,
  categories = [],
  className,
  listing,
}: ComilmartHeaderProps & { listing: boolean }) {
  const pathname = usePathname();
  const { itemCount, openDrawer } = useShopCart();
  const [menuOpen, setMenuOpen] = useState(false);
  const [types, setTypes] = useState<PublicCatalogType[]>([]);
  const categoryPathSlug = pathname.startsWith("/shop/c/")
    ? pathname.slice("/shop/c/".length).split("/")[0]
    : undefined;
  const wa = whatsapp?.replace(/\D/g, "") || "";
  const locality =
    [areaLabel?.trim(), branchHint?.trim()].filter(Boolean).join(" · ") ||
    "Deliver to your area";
  const isHome =
    !listing &&
    (pathname === "/" ||
      pathname === APP_ROUTES.shop ||
      pathname === `${APP_ROUTES.shop}/`);
  const visibleCategories = categories.slice(0, 12);
  const visibleTypes = filterShopperTypes(types).slice(0, 8);

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
      <div className={styles.promoBar}>
        <p>
          {announcement?.trim() ||
            "Order online — pay by M-Pesa, card, or cash on delivery."}
        </p>
        {wa ? (
          <a href={`https://wa.me/${wa}`} className={styles.promoCta}>
            Chat on WhatsApp
          </a>
        ) : null}
      </div>

      <div className={styles.utilityBar}>
        <div className={styles.utilityLeft}>
          <LiveClock />
          <span className={styles.utilityDot} aria-hidden />
          <span className={styles.utilityLink}>Shop</span>
          {wa ? (
            <a href={`https://wa.me/${wa}`} className={styles.utilityLink}>
              WhatsApp
            </a>
          ) : null}
        </div>
        <div className={styles.utilityRight}>
          <span className={styles.verified}>✓ Verified shop</span>
          <StorefrontAccountLink className={styles.signIn}>
            Sign in
          </StorefrontAccountLink>
        </div>
      </div>

      <div className={styles.mainBar}>
        <Link href={APP_ROUTES.shop} className={styles.logo}>
          <span className={styles.logoShell}>
            <StorefrontEditableLogoMark
              logoUrl={logoUrl}
              alt={storeName}
              width={240}
              height={56}
              className={styles.logoImg}
              fallback={<span className={styles.logoText}>{storeName}</span>}
            />
          </span>
        </Link>

        <button
          type="button"
          className={styles.categoriesBtn}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((v) => !v)}
        >
          <span aria-hidden>☰</span> All categories
        </button>

        <Suspense fallback={null}>
          <SearchForm className={styles.mainSearch} />
        </Suspense>

        <div className={styles.deliverTo}>
          <span className={styles.deliverLabel}>Deliver to:</span>
          <span className={styles.deliverValue}>{locality}</span>
        </div>

        <div className={styles.mainActions}>
          <StorefrontAccountLink className={styles.signUpBtn}>
            Sign up free
          </StorefrontAccountLink>
          <button
            type="button"
            className={styles.cartBtn}
            onClick={openDrawer}
            aria-label={
              itemCount > 0 ? `Open cart, ${itemCount} items` : "Open cart"
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
        </div>
      </div>

      <div className={styles.drawer} hidden={!menuOpen}>
        <div className={styles.drawerGrid}>
          {visibleCategories.map((cat) => (
            <Link
              key={cat.id}
              href={shopListPath({
                categoryPathSlug: storefrontCategoryPathSlug(cat),
                typeId: undefined,
              })}
              className={styles.drawerLink}
              onClick={() => setMenuOpen(false)}
            >
              {cat.name}
            </Link>
          ))}
          {visibleTypes.map((type) => (
            <Link
              key={type.id}
              href={shopListPath({
                categoryPathSlug,
                typeId: type.id,
              })}
              className={styles.drawerLink}
              onClick={() => setMenuOpen(false)}
            >
              {type.label}
            </Link>
          ))}
        </div>
      </div>
    </header>
  );
}
