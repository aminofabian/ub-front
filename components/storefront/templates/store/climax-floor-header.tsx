"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Search, ShoppingBag } from "lucide-react";
import { Suspense, useState } from "react";

import { useStorefrontAccountLink } from "@/components/storefront/storefront-account-link";
import { StorefrontEditableLogoMark } from "@/components/storefront/storefront-editable-logo";
import styles from "@/components/storefront/templates/store/climax-floor.module.css";
import { useShopCart } from "@/hooks/use-shop-cart";
import { APP_ROUTES } from "@/lib/config";
import type { PublicCategory } from "@/lib/public-storefront";
import { shopListPath, storefrontCategoryPathSlug } from "@/lib/shop-url";
import { cn } from "@/lib/utils";

function SearchForm() {
  const pathname = usePathname();
  const sp = useSearchParams();
  const q = sp.get("q")?.trim() ?? "";
  const typeId = sp.get("typeId")?.trim() || sp.get("departmentId")?.trim();
  const action = pathname.startsWith("/shop") ? pathname : APP_ROUTES.shop;

  return (
    <form action={action} method="get" className={styles.searchForm} role="search">
      <label className={styles.srOnly} htmlFor="cf-search-q">
        Search products
      </label>
      <input
        id="cf-search-q"
        name="q"
        type="search"
        defaultValue={q}
        placeholder="Search products"
      />
      {typeId ? <input type="hidden" name="typeId" value={typeId} /> : null}
      <button type="submit">Search</button>
    </form>
  );
}

function NavLinks({
  className,
  onNavigate,
}: {
  className?: string;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const shopActive =
    pathname === APP_ROUTES.shop || pathname.startsWith(`${APP_ROUTES.shop}/`);

  return (
    <nav className={cn(styles.nav, className)} aria-label="Shop">
      <Link href={APP_ROUTES.shopCart} className={styles.navLink} onClick={onNavigate}>
        Cart
      </Link>
      <Link
        href={APP_ROUTES.shopCheckout}
        className={styles.navLink}
        onClick={onNavigate}
      >
        Checkout
      </Link>
      <Link
        href={APP_ROUTES.shopAccount}
        className={styles.navLink}
        onClick={onNavigate}
      >
        My account
      </Link>
      <Link
        href={APP_ROUTES.shop}
        className={cn(styles.navLink, shopActive && styles.navLinkActive)}
        onClick={onNavigate}
      >
        Shop
      </Link>
    </nav>
  );
}

type ClimaxFloorHeaderProps = {
  storeName: string;
  logoUrl?: string | null;
  tagline?: string | null;
  categories?: PublicCategory[];
  className?: string;
};

export function ClimaxFloorHeader(props: ClimaxFloorHeaderProps) {
  return (
    <Suspense fallback={<ClimaxFloorHeaderView {...props} />}>
      <ClimaxFloorHeaderView {...props} />
    </Suspense>
  );
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "CF";
  if (parts.length === 1) return parts[0]!.slice(0, 3).toUpperCase();
  return `${parts[0]![0] ?? ""}${parts[1]![0] ?? ""}`.toUpperCase();
}

function ClimaxFloorHeaderView({
  storeName,
  logoUrl,
  tagline,
  categories = [],
  className,
}: ClimaxFloorHeaderProps) {
  const { itemCount, openDrawer } = useShopCart();
  const { signedIn, href, onActivate } = useStorefrontAccountLink();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  return (
    <header
      className={cn(styles.header, className)}
      data-open={menuOpen ? "true" : undefined}
      data-search={searchOpen ? "true" : undefined}
    >
      <div className={styles.headerInner}>
        <Link href={APP_ROUTES.shop} className={styles.brand}>
          <span className={styles.logoMark}>
            <StorefrontEditableLogoMark
              logoUrl={logoUrl}
              alt={storeName}
              width={52}
              height={52}
              className={styles.logoImg}
              fallback={
                <span className={styles.logoFallback}>{initials(storeName)}</span>
              }
            />
          </span>
          <span className={styles.brandText}>
            <span className={styles.brandName}>{storeName}</span>
            {tagline ? <span className={styles.brandTag}>{tagline}</span> : null}
          </span>
        </Link>

        <Suspense fallback={null}>
          <NavLinks />
        </Suspense>

        <div className={styles.tools}>
          {signedIn ? (
            <Link href={href} className={styles.login} onClick={onActivate}>
              Account
            </Link>
          ) : (
            <Link href={href} className={styles.login} onClick={onActivate}>
              Login / Register
            </Link>
          )}
          <button
            type="button"
            className={styles.searchToggle}
            aria-label="Search"
            aria-expanded={searchOpen}
            onClick={() => {
              setSearchOpen((v) => !v);
              setMenuOpen(false);
            }}
          >
            <Search size={18} strokeWidth={1.8} />
          </button>
          <button
            type="button"
            className={styles.cartBtn}
            onClick={openDrawer}
            aria-label={
              itemCount > 0 ? `Open cart, ${itemCount} items` : "Open cart"
            }
          >
            <ShoppingBag size={18} strokeWidth={1.8} />
            {itemCount > 0 ? (
              <span className={styles.cartCount}>{Math.min(itemCount, 99)}</span>
            ) : null}
          </button>
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
        </div>
      </div>

      <div className={styles.searchPanel}>
        <Suspense fallback={null}>
          <SearchForm />
        </Suspense>
      </div>

      <div className={styles.drawer}>
        <Suspense fallback={null}>
          <SearchForm />
        </Suspense>
        <Suspense fallback={null}>
          <NavLinks onNavigate={() => setMenuOpen(false)} />
        </Suspense>
        {categories.filter((c) => !c.parentId).length > 0 ? (
          <ul className={styles.catList}>
            {categories
              .filter((c) => !c.parentId)
              .map((cat) => (
                <li key={cat.id}>
                  <Link
                    href={shopListPath({
                      categoryPathSlug: storefrontCategoryPathSlug(cat),
                    })}
                    className={styles.catLink}
                    onClick={() => setMenuOpen(false)}
                  >
                    {cat.name}
                  </Link>
                </li>
              ))}
          </ul>
        ) : null}
      </div>
    </header>
  );
}
